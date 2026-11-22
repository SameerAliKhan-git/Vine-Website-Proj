import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CalendarDays, History, Inbox, Mail, MailOpen, Phone, Radio, RefreshCw, ShieldAlert, ShieldCheck, Youtube } from "lucide-react";
import { adminApi, auth } from "../lib/api.js";
import { formatDate, formatTime, liveEmbed, nextOccurrence, prettyTitle, telHref, toDate, youtubeId } from "../lib/format.js";
import { clearSermonCache } from "../lib/SiteContext.jsx";
import { PAGE_HEADINGS } from "../lib/pageText.js";
import CollectionEditor, { DeleteButton } from "./CollectionEditor.jsx";
import { FieldGrid } from "./fields.jsx";
import { useToast } from "./toast.jsx";

function PanelHeader({ title, children }) {
  return (
    <header className="panel-header">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}

/* ---------------- Dashboard ---------------- */

const AREA_LABELS = { sessions: "Session", activities: "Activity", sermons: "Message", gallery: "Photo", ministries: "Ministry", leaders: "Leader" };

function describeChange(entry) {
  const [area] = (entry.recordKey || "").split(":");
  if (entry.table === "people") {
    const what = { create: "Account created", "set role": "Access changed", "reset password": "Password reset", remove: "Account removed" }[entry.action] || "People updated";
    return `${what}: ${entry.recordKey}`;
  }
  if (entry.table === "site_config") {
    const what = entry.recordKey === "live" ? "Live stream" : "Site settings";
    const keys = entry.changedKeys || [];
    return `${what} updated${keys.length ? ` (${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ", …" : ""})` : ""}`;
  }
  const verb = { insert: "added", update: "edited", delete: "deleted" }[entry.action] || entry.action;
  return `${AREA_LABELS[area] || "Item"} ${verb}`;
}

const whenText = (iso) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export function Dashboard({ data }) {
  const now = Date.now();
  const upcoming = data.sessions
    .map((s) => nextOccurrence(s, now))
    .filter((s) => (s.time ?? 0) > now)
    .sort((a, b) => a.time - b.time);
  const unread = data.messages.filter((m) => !m.read).length;
  const cards = [
    { to: "/admin/live", Icon: Radio, label: "Live status", value: data.live.isLive ? "LIVE NOW" : "Offline", hot: data.live.isLive },
    { to: "/admin/live", Icon: CalendarClock, label: "Upcoming sessions", value: upcoming.length },
    { to: "/admin/activities", Icon: CalendarDays, label: "Activities", value: data.activities.length },
    { to: "/admin/inbox", Icon: Inbox, label: "Unread messages", value: unread, hot: unread > 0 },
  ];
  const giving = data.givingChange;
  const givingRecent = giving && now - Date.parse(giving.at) < 7 * 86_400_000;
  return (
    <>
      <PanelHeader title="Welcome back">Here’s what’s happening on the {data.settings.name} website.</PanelHeader>
      <div className="stat-grid">
        {cards.map(({ to, Icon, label, value, hot }) => (
          <Link key={label} to={to} className={`stat${hot ? " stat--hot" : ""}`}>
            <Icon size={20} aria-hidden="true" />
            <span className="stat__value">{value}</span>
            <span className="stat__label">{label}</span>
          </Link>
        ))}
      </div>
      {giving && (
        <div className={`a-card a-callout${givingRecent ? " a-callout--warn" : ""}`}>
          {givingRecent ? <ShieldAlert size={22} aria-hidden="true" /> : <ShieldCheck size={22} aria-hidden="true" />}
          <div>
            <strong>Giving details last changed {whenText(giving.at)}</strong> by {giving.by || "an admin"}.
            <p className="a-help">
              If you didn’t expect this, check the UPI and bank details in <Link to="/admin/settings">Site settings → Giving</Link> right away
              and change your password.
            </p>
          </div>
        </div>
      )}
      <div className="a-card">
        <h3>Next up</h3>
        {upcoming.length ? (
          <ul className="simple-list">
            {upcoming.slice(0, 4).map((s) => (
              <li key={s.id}>
                <strong>{s.title}</strong> — {formatDate(s.startsAt, { weekday: true })}, {formatTime(s.startsAt)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="a-empty">
            No upcoming sessions. <Link to="/admin/live">Add one</Link> so visitors know when to tune in.
          </p>
        )}
      </div>
      <div className="a-card">
        <h3>
          <History size={17} aria-hidden="true" /> Recent changes
        </h3>
        {data.audit?.length ? (
          <ul className="audit-list">
            {data.audit.map((entry, i) => (
              <li key={i}>
                <span>{describeChange(entry)}</span>
                <small>
                  {entry.actorEmail || "system"} · {whenText(entry.at)}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="a-empty">No changes yet.</p>
        )}
      </div>
      <div className="a-card">
        <h3>Quick guide</h3>
        <ol className="simple-list">
          <li>
            <strong>Going live on Sunday?</strong> Open <Link to="/admin/live">Live & sessions</Link>, paste your YouTube live link and switch “We are
            live” on.
          </li>
          <li>
            <strong>Previous messages</strong> appear automatically once your YouTube channel is set in{" "}
            <Link to="/admin/settings">Site settings → YouTube</Link>.
          </li>
          <li>
            <strong>New event?</strong> Add it under <Link to="/admin/activities">Activities</Link> with a photo and date.
          </li>
          <li>
            <strong>Logo, address, map & service times</strong> live in <Link to="/admin/settings">Site settings</Link>.
          </li>
          <li>
            <strong>Protect your account:</strong> turn on two-step sign-in under <Link to="/admin/account">Account & security</Link>.
          </li>
        </ol>
      </div>
    </>
  );
}

/* ---------------- Live & sessions ---------------- */

const sessionFields = [
  { name: "title", label: "Session title", required: true, placeholder: "Sunday Worship Service" },
  { name: "startsAt", label: "Date & start time (church time)", type: "datetime", required: true, help: "Enter the local time at church. Visitors in other countries see it converted." },
  { name: "repeatWeekly", label: "Repeats every week", help: "For regular services: the date moves forward automatically each week.", type: "checkbox" },
  { name: "speaker", label: "Speaker / preacher", placeholder: "Pastor …" },
  { name: "streamUrl", label: "Stream link (optional)", type: "url", placeholder: "https://youtube.com/live/…", help: "A YouTube, Zoom or other link where people can join." },
  { name: "description", label: "Short description", type: "textarea", rows: 3, wide: true },
];

function AutoLiveStatus({ youtube }) {
  const auto = youtube?.live;
  if (!youtube?.channelId) return <p className="a-warning">Set your YouTube channel in Site settings to turn on automatic live detection.</p>;
  if (!auto?.checkedAt) return <p className="a-help">Waiting for the first check of your YouTube channel…</p>;
  const checked = `checked ${formatTime(auto.checkedAt)}`;
  if (auto.status === "live")
    return (
      <p className="auto-live auto-live--on">
        <span className="live-dot" aria-hidden="true" />
        <span>
          Live on YouTube now: <strong>{prettyTitle(auto.title)}</strong> ({checked})
        </span>
      </p>
    );
  if (auto.status === "upcoming")
    return (
      <p className="auto-live">
        <CalendarClock size={15} aria-hidden="true" />
        <span>
          Next scheduled stream: <strong>{prettyTitle(auto.title)}</strong>, {formatDate(auto.startsAt, { weekday: true })} at{" "}
          {formatTime(auto.startsAt)} ({checked})
        </span>
      </p>
    );
  return <p className="auto-live">Not live on YouTube right now ({checked}).</p>;
}

export function LivePanel({ data, setData }) {
  const [live, setLive] = useState(data.live);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const preview = liveEmbed({ ...live, isLive: true }, data.settings, data.youtube);

  async function save(next = live) {
    setSaving(true);
    try {
      const saved = await adminApi.saveConfig("live", next);
      setLive(saved);
      setData((d) => ({ ...d, live: saved }));
      toast(saved.isLive ? "You’re live! The website now shows your stream." : "Live settings saved.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const sessions = [...data.sessions].sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));

  return (
    <>
      <PanelHeader title="Live & upcoming sessions">Control the live player on the Services page and the list of upcoming sessions.</PanelHeader>

      <form
        className={`a-card live-card${live.isLive ? " live-card--on" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="live-card__top">
          <div>
            <h3>
              <Radio size={18} aria-hidden="true" /> Live stream
            </h3>
            <p className="a-help">
              Automatic: when your YouTube channel goes live, the website switches to the live player by itself within about a minute. Use the
              switch only to force it on (for example, a stream from another channel).
            </p>
            <AutoLiveStatus youtube={data.youtube} />
          </div>
          <button
            type="button"
            className={`switch${live.isLive ? " switch--on" : ""}`}
            role="switch"
            aria-checked={live.isLive}
            disabled={saving}
            onClick={() => {
              const next = { ...live, isLive: !live.isLive };
              setLive(next);
              save(next);
            }}
          >
            <span className="switch__knob" />
            <span className="switch__label">{live.isLive ? "We are live" : "Offline"}</span>
          </button>
        </div>
        <FieldGrid
          fields={[
            {
              name: "videoUrl",
              label: "YouTube live link",
              type: "url",
              wide: true,
              placeholder: "https://www.youtube.com/live/XXXXXXXXXXX",
              help: data.youtube?.channelId
                ? "Leave empty to automatically show whatever is currently live on your YouTube channel."
                : "Paste the link of your YouTube live stream (or set your channel in Site settings to detect it automatically).",
            },
            { name: "title", label: "Title shown to viewers", placeholder: "Sunday Worship Service" },
            { name: "speaker", label: "Speaker" },
            { name: "description", label: "Description", type: "textarea", rows: 2, wide: true },
          ]}
          value={live}
          onChange={setLive}
        />
        {live.videoUrl && !youtubeId(live.videoUrl) && <p className="a-warning">That doesn’t look like a YouTube video or live link yet.</p>}
        {preview && (
          <details className="live-preview">
            <summary>Preview player</summary>
            <div className="video-frame">
              <iframe src={preview.replace("autoplay=1", "autoplay=0")} title="Live preview" allowFullScreen />
            </div>
          </details>
        )}
        <div className="editor__actions">
          <button type="submit" className="a-btn a-btn--primary" disabled={saving}>
            {saving ? "Saving…" : "Save live details"}
          </button>
        </div>
      </form>

      <section className="a-section">
        <h2>Upcoming sessions</h2>
        <p className="a-help">These appear on the Services page with a countdown and “Add to calendar” button. Past sessions hide themselves automatically.</p>
        <CollectionEditor
          collection="sessions"
          items={sessions}
          onItemsChange={(sessions) => setData((d) => ({ ...d, sessions }))}
          fields={sessionFields}
          blank={{ title: "", startsAt: "", repeatWeekly: false, speaker: "", streamUrl: "", description: "" }}
          addLabel="Add session"
          reorderable={false}
          describe={(s) => {
            const past = !s.repeatWeekly && (toDate(s.startsAt)?.getTime() ?? 0) + 2 * 3600_000 < Date.now();
            const when = s.startsAt ? nextOccurrence(s).startsAt : "";
            return {
              title: s.title,
              meta: `${s.repeatWeekly ? "Every week · next " : ""}${when ? `${formatDate(when, { weekday: true })} · ${formatTime(when)}` : "No date"}${s.speaker ? ` · ${s.speaker}` : ""}${past ? " · (past — hidden)" : ""}`,
            };
          }}
        />
      </section>
    </>
  );
}

/* ---------------- Activities ---------------- */

export function ActivitiesPanel({ data, setData }) {
  return (
    <>
      <PanelHeader title="Church activities">Events, outreach, fellowship and special services. “Featured” activities appear on the home page first.</PanelHeader>
      <CollectionEditor
        collection="activities"
        items={data.activities}
        onItemsChange={(activities) => setData((d) => ({ ...d, activities }))}
        addLabel="Add activity"
        blank={{ title: "", category: "", date: "", time: "", location: "", description: "", image: "", registrationUrl: "", featured: false }}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "category", label: "Category", placeholder: "Outreach, Youth, Fellowship…" },
          { name: "date", label: "Date", type: "date", help: "Leave empty for “date coming soon”." },
          { name: "time", label: "Time", placeholder: "6:00 PM – 8:00 PM" },
          { name: "location", label: "Location", placeholder: "Church hall" },
          { name: "registrationUrl", label: "Registration link (optional)", type: "url", placeholder: "https://forms.gle/…" },
          { name: "description", label: "Description", type: "textarea", wide: true },
          { name: "image", label: "Photo", type: "image", wide: true },
          { name: "featured", label: "Feature on the home page", type: "checkbox" },
        ]}
        describe={(a) => ({
          title: `${a.featured ? "★ " : ""}${a.title}`,
          meta: [a.date ? formatDate(a.date) : "Date TBA", a.category, a.location].filter(Boolean).join(" · "),
          image: a.image || "",
        })}
      />
    </>
  );
}

/* ---------------- Sermons ---------------- */

export function SermonsPanel({ data, setData }) {
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();
  const yt = data.youtube || {};
  const connected = data.settings.youtubeChannelId || data.settings.youtubePlaylistId;

  async function syncNow() {
    setSyncing(true);
    try {
      const result = await adminApi.syncYouTube();
      setData((d) => ({
        ...d,
        youtube: { ...d.youtube, ...result, lastSync: new Date().toISOString(), lastError: result.ok ? null : result.error },
      }));
      clearSermonCache();
      if (result.ok) toast(`YouTube synced — ${result.count ?? 0} videos in the library.`);
      else toast(result.error || "YouTube sync failed.", "error");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <PanelHeader title="Previous messages">The message library on the Services page combines your YouTube uploads with any messages you add here.</PanelHeader>
      <div className={`a-card a-callout${connected && !yt.lastError ? "" : " a-callout--warn"}`}>
        <Youtube size={22} aria-hidden="true" />
        <div>
          {!connected ? (
            <>
              <strong>Connect your YouTube channel</strong> in <Link to="/admin/settings">Site settings → YouTube</Link> to show your latest services
              automatically.
            </>
          ) : yt.lastError ? (
            <>
              <strong>YouTube sync problem:</strong> {yt.lastError}
            </>
          ) : (
            <>
              <strong>YouTube is connected.</strong> {yt.count ?? 0} videos in the library
              {yt.lastSync ? `, last checked ${new Date(yt.lastSync).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}.
              New uploads appear within ~20 minutes.
            </>
          )}
          <p className="a-help">
            YouTube’s public feed lists the newest 15 videos; the website keeps every video it has seen, so the library grows each week. Add older
            or special messages below with speaker and series details.
          </p>
          {connected && (
            <button type="button" className="a-btn a-btn--ghost a-btn--tiny" onClick={syncNow} disabled={syncing}>
              <RefreshCw size={14} aria-hidden="true" /> {syncing ? "Syncing…" : "Sync now"}
            </button>
          )}
        </div>
      </div>
      <CollectionEditor
        collection="sermons"
        items={data.sermons}
        onItemsChange={(sermons) => setData((d) => ({ ...d, sermons }))}
        addLabel="Add message"
        blank={{ title: "", speaker: "", date: "", videoUrl: "", scripture: "", series: "", description: "" }}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "videoUrl", label: "YouTube link", type: "url", required: true, placeholder: "https://www.youtube.com/watch?v=…" },
          { name: "speaker", label: "Speaker" },
          { name: "date", label: "Date preached", type: "date" },
          { name: "series", label: "Series", placeholder: "e.g. Rooted" },
          { name: "scripture", label: "Scripture", placeholder: "John 15:1-8" },
          { name: "description", label: "Summary", type: "textarea", wide: true },
        ]}
        describe={(s) => {
          const id = youtubeId(s.videoUrl);
          return {
            title: s.title,
            meta: [s.date && formatDate(s.date), s.speaker, s.series, !id && "⚠ invalid YouTube link"].filter(Boolean).join(" · "),
            image: id ? `https://i.ytimg.com/vi/${id}/default.jpg` : "",
          };
        }}
      />
    </>
  );
}

/* ---------------- Gallery ---------------- */

export function GalleryPanel({ data, setData }) {
  return (
    <>
      <PanelHeader title="Photo gallery">Photos for the Gallery page. The first six also appear on the home page.</PanelHeader>
      <CollectionEditor
        collection="gallery"
        items={data.gallery || []}
        onItemsChange={(gallery) => setData((d) => ({ ...d, gallery }))}
        addLabel="Add photo"
        blank={{ title: "", image: "" }}
        fields={[
          { name: "image", label: "Photo", type: "image", wide: true },
          { name: "title", label: "Caption", required: true, wide: true, placeholder: "e.g. Christmas with our cell group" },
        ]}
        describe={(p) => ({ title: p.title, image: p.image || "" })}
      />
    </>
  );
}

/* ---------------- Ministries & leaders ---------------- */

export function MinistriesPanel({ data, setData }) {
  return (
    <>
      <PanelHeader title="Ministries">The first four appear on the home page; all of them appear on the Ministries page.</PanelHeader>
      <CollectionEditor
        collection="ministries"
        items={data.ministries}
        onItemsChange={(ministries) => setData((d) => ({ ...d, ministries }))}
        addLabel="Add ministry"
        blank={{ title: "", category: "", description: "", image: "", schedule: "", leader: "" }}
        fields={[
          { name: "title", label: "Name", required: true, placeholder: "Youth" },
          { name: "category", label: "Tagline", placeholder: "Grow together" },
          { name: "schedule", label: "When it meets", placeholder: "Saturdays, 5 PM" },
          { name: "leader", label: "Leader / contact" },
          { name: "description", label: "Description", type: "textarea", wide: true },
          { name: "image", label: "Photo", type: "image", wide: true },
        ]}
        describe={(m) => ({ title: m.title, meta: [m.category, m.schedule].filter(Boolean).join(" · "), image: m.image || "" })}
      />
    </>
  );
}

export function LeadersPanel({ data, setData }) {
  return (
    <>
      <PanelHeader title="Leadership team">Shown on the About page.</PanelHeader>
      <CollectionEditor
        collection="leaders"
        items={data.leaders}
        onItemsChange={(leaders) => setData((d) => ({ ...d, leaders }))}
        addLabel="Add leader"
        blank={{ name: "", role: "", bio: "", photo: "" }}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "role", label: "Role", placeholder: "Senior Pastor" },
          { name: "bio", label: "Short bio", type: "textarea", wide: true },
          { name: "photo", label: "Photo", type: "image", wide: true },
        ]}
        describe={(l) => ({ title: l.name, meta: l.role, image: l.photo || "" })}
        emptyText="No leaders added yet. The About page hides this section until you add someone."
      />
    </>
  );
}

/* ---------------- Inbox ---------------- */

export function InboxPanel({ data, setData }) {
  const [filter, setFilter] = useState("all");
  const toast = useToast();
  const messages = data.messages.filter((m) => filter === "all" || m.type === filter);

  const setMessages = (fn) => setData((d) => ({ ...d, messages: fn(d.messages) }));

  async function toggleRead(message) {
    const read = !message.read;
    setMessages((list) => list.map((m) => (m.id === message.id ? { ...m, read } : m)));
    try {
      await adminApi.markRead(message.id, read);
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function remove(id) {
    try {
      await adminApi.deleteMessage(id);
      setMessages((list) => list.filter((m) => m.id !== id));
    } catch (error) {
      toast(error.message, "error");
    }
  }

  return (
    <>
      <PanelHeader title="Inbox">
        Messages and prayer requests sent from the Visit page. Only signed-in admins can see these. They’re deleted automatically after{" "}
        {data.settings.messageRetentionMonths || 12} months.
      </PanelHeader>
      <div className="filter-chips">
        {[
          ["all", "All"],
          ["contact", "Messages"],
          ["prayer", "Prayer requests"],
        ].map(([value, label]) => (
          <button key={value} type="button" className={`chip${filter === value ? " chip--active" : ""}`} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>
      {messages.length === 0 && <p className="a-empty">No messages yet.</p>}
      <ul className="inbox">
        {messages.map((m) => (
          <li key={m.id} className={m.read ? "" : "is-unread"}>
            <div className="inbox__head">
              <span className={`tag tag--${m.type}`}>{m.type === "prayer" ? "Prayer" : "Message"}</span>
              <strong>{m.name}</strong>
              <time>{new Date(m.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time>
            </div>
            <p>{m.message}</p>
            <div className="inbox__foot">
              {m.email && (
                <a href={`mailto:${m.email}`}>
                  <Mail size={14} aria-hidden="true" /> {m.email}
                </a>
              )}
              {m.phone && (
                <a href={telHref(m.phone)}>
                  <Phone size={14} aria-hidden="true" /> {m.phone}
                </a>
              )}
              <span className="inbox__tools">
                <button type="button" className="a-btn a-btn--ghost a-btn--tiny" onClick={() => toggleRead(m)}>
                  <MailOpen size={14} aria-hidden="true" /> Mark {m.read ? "unread" : "read"}
                </button>
                <DeleteButton onConfirm={() => remove(m.id)} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------------- Settings ---------------- */

const settingGroups = [
  {
    title: "Church & branding",
    fields: [
      { name: "name", label: "Church name", required: true },
      { name: "location", label: "City / location", placeholder: "Hyderabad, India" },
      { name: "timeZone", label: "Time zone", placeholder: "Asia/Kolkata", help: "Used for service times and countdowns. Leave as Asia/Kolkata for India." },
      { name: "tagline", label: "Tagline", wide: true },
      { name: "logoUrl", label: "Logo", type: "image", raw: true, help: "Square PNG works best (at least 512×512). Also used as the browser tab icon." },
      { name: "heroImage", label: "Home page banner photo", type: "image", help: "Wide landscape photo, at least 1600px across." },
    ],
  },
  {
    title: "Announcement bar",
    fields: [
      { name: "announcementEnabled", label: "Show the announcement bar at the top of every page", type: "checkbox" },
      { name: "announcementText", label: "Text", wide: true },
      { name: "announcementLinkText", label: "Link text" },
      { name: "announcementLink", label: "Link", placeholder: "/activities or https://…" },
    ],
  },
  {
    title: "Service times",
    fields: [
      {
        name: "serviceTimes",
        label: "Weekly gatherings",
        type: "objects",
        wide: true,
        columns: [
          { name: "day", label: "Day (e.g. Sunday)" },
          { name: "time", label: "Time (e.g. 10:00 AM)" },
          { name: "label", label: "Name (e.g. Sunday service)" },
          { name: "place", label: "Location (optional)" },
        ],
      },
    ],
  },
  {
    title: "Address, map & contact",
    fields: [
      { name: "address", label: "Address", type: "textarea", rows: 2, wide: true },
      {
        name: "mapEmbedUrl",
        label: "Google Maps embed",
        wide: true,
        help: "In Google Maps: Share → Embed a map → Copy HTML, then paste it here (the whole <iframe> code is fine).",
      },
      { name: "mapDirectionsUrl", label: "Directions link", type: "url", wide: true, help: "In Google Maps: Share → Copy link." },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "prayerPhones", label: "Prayer line numbers", help: "Separate several numbers with commas." },
      { name: "whatsapp", label: "WhatsApp number", placeholder: "+91 98765 43210" },
      { name: "email", label: "Email address(es)", help: "Separate several addresses with commas." },
    ],
  },
  {
    title: "YouTube & social media",
    fields: [
      {
        name: "youtubeChannelId",
        label: "YouTube channel",
        wide: true,
        placeholder: "https://www.youtube.com/@yourchurch",
        help: "Paste your channel link or @handle. Used for the previous messages library and automatic live detection.",
      },
      {
        name: "youtubePlaylistId",
        label: "Sermon playlist (optional)",
        wide: true,
        placeholder: "https://www.youtube.com/playlist?list=…",
        help: "If set, the message library shows this playlist instead of all channel uploads.",
      },
      { name: "youtubeUrl", label: "YouTube channel link (for buttons)", type: "url" },
      { name: "instagramUrl", label: "Instagram link", type: "url" },
      { name: "facebookUrl", label: "Facebook link", type: "url" },
    ],
  },
  {
    title: "About page",
    fields: [
      { name: "aboutStory", label: "Our story", type: "textarea", rows: 6, wide: true, help: "Leave a blank line between paragraphs." },
      { name: "aboutMission", label: "Mission", type: "textarea", rows: 2, wide: true },
      { name: "aboutVision", label: "Vision", type: "textarea", rows: 2, wide: true },
      { name: "beliefs", label: "What we believe", type: "list", wide: true },
    ],
  },
  {
    title: "Giving",
    fields: [
      { name: "givingIntro", label: "Introduction", type: "textarea", rows: 2, wide: true },
      { name: "upiId", label: "UPI ID", placeholder: "church@okbank" },
      { name: "upiQrImage", label: "UPI QR code image", type: "image", raw: true, help: "Uploaded exactly as-is so it stays scannable." },
      { name: "bankAccountName", label: "Account name" },
      { name: "bankAccountNumber", label: "Account number" },
      { name: "bankIfsc", label: "IFSC code" },
      { name: "bankName", label: "Bank name" },
      { name: "bankBranch", label: "Branch" },
    ],
  },
  {
    title: "Footer",
    fields: [{ name: "registrationNote", label: "Registration / trust note", wide: true, placeholder: "Registered under the … Act, Reg. No. …" }],
  },
  {
    title: "Privacy & data",
    fields: [
      {
        name: "messageRetentionMonths",
        label: "Delete messages & prayer requests after (months)",
        type: "number",
        min: 1,
        max: 120,
        help: "Shown on the Privacy page. Older messages are deleted automatically every night.",
      },
    ],
  },
];

export function SettingsPanel({ data, setData }) {
  const [draft, setDraft] = useState(data.settings);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.settings);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const value = { ...draft, messageRetentionMonths: Number(draft.messageRetentionMonths) || 12 };
      const youtubeChanged =
        value.youtubeChannelId !== data.settings.youtubeChannelId || value.youtubePlaylistId !== data.settings.youtubePlaylistId;
      const saved = await adminApi.saveConfig("settings", value);
      setDraft(saved);
      setData((d) => ({ ...d, settings: saved }));
      toast("Settings saved.");
      if (youtubeChanged && (saved.youtubeChannelId || saved.youtubePlaylistId)) {
        const result = await adminApi.syncYouTube().catch((error) => ({ ok: false, error: error.message }));
        setData((d) => ({ ...d, youtube: { ...d.youtube, ...result, lastError: result.ok ? null : result.error } }));
        clearSermonCache();
        if (result.ok) toast(`YouTube connected — ${result.count ?? 0} videos found.`);
        else toast(result.error || "Couldn’t connect to YouTube.", "error");
      }
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <PanelHeader title="Site settings">Branding, contact details, map, service times, YouTube and giving information.</PanelHeader>
      {settingGroups.map((group) => (
        <section className="a-card" key={group.title}>
          <h3>{group.title}</h3>
          <FieldGrid fields={group.fields} value={draft} onChange={setDraft} />
        </section>
      ))}
      <div className={`save-bar${dirty ? " save-bar--dirty" : ""}`}>
        <span>{dirty ? "You have unsaved changes." : "All changes saved."}</span>
        <button type="button" className="a-btn a-btn--ghost" disabled={!dirty || saving} onClick={() => setDraft(data.settings)}>
          Discard
        </button>
        <button type="submit" className="a-btn a-btn--primary" disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

/* ---------------- Page headings ---------------- */

export function PageTextPanel({ data, setData }) {
  const saved = data.settings.pageText && typeof data.settings.pageText === "object" ? data.settings.pageText : {};
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      // Drop empty values so the built-in wording is used for them.
      const pageText = Object.fromEntries(
        Object.entries(draft)
          .map(([page, fields]) => [page, Object.fromEntries(Object.entries(fields || {}).filter(([, v]) => typeof v === "string" && v.trim()))])
          .filter(([, fields]) => Object.keys(fields).length),
      );
      const value = await adminApi.saveConfig("settings", { ...data.settings, pageText });
      setDraft(value.pageText || {});
      setData((d) => ({ ...d, settings: value }));
      toast("Page headings saved.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <PanelHeader title="Page headings">
        The big heading and photo at the top of each page. Leave a box empty to keep the wording shown in grey.
      </PanelHeader>
      {PAGE_HEADINGS.map((page) => (
        <section className="a-card" key={page.page}>
          <h3>{page.label}</h3>
          <FieldGrid
            fields={[
              ...(page.noEyebrow ? [] : [{ name: "eyebrow", label: "Small label above the heading", placeholder: page.eyebrow, wide: true }]),
              { name: "title", label: "Heading", placeholder: page.title },
              { name: "accent", label: "Heading, second part (in colour)", placeholder: page.accent },
              { name: "intro", label: "Introduction", type: "textarea", rows: 2, placeholder: page.intro, wide: true },
              ...(page.page === "home" ? [] : [{ name: "image", label: "Banner photo", type: "image", help: "Wide landscape photo. Leave empty for the current church photo." }]),
            ]}
            value={draft[page.page] || {}}
            onChange={(next) => setDraft((d) => ({ ...d, [page.page]: next }))}
          />
        </section>
      ))}
      <p className="a-help">The home page banner photo is under Site settings → Church &amp; branding.</p>
      <div className={`save-bar${dirty ? " save-bar--dirty" : ""}`}>
        <span>{dirty ? "You have unsaved changes." : "All changes saved."}</span>
        <button type="button" className="a-btn a-btn--ghost" disabled={!dirty || saving} onClick={() => setDraft(saved)}>
          Discard
        </button>
        <button type="submit" className="a-btn a-btn--primary" disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save headings"}
        </button>
      </div>
    </form>
  );
}

/* ---------------- Account ---------------- */

const MIN_PASSWORD = 10;

function TwoStepCard() {
  const [factors, setFactors] = useState(null);
  const [setup, setSetup] = useState(null); // { factorId, qr, secret }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    auth.mfa
      .factors()
      .then((list) => active && setFactors(list))
      .catch((error) => active && toast(error.message, "error"));
    return () => {
      active = false;
    };
  }, [reloadKey, toast]);

  const verified = (factors || []).filter((f) => f.status === "verified");
  const reload = () => setReloadKey((k) => k + 1);

  async function start() {
    setBusy(true);
    try {
      setSetup(await auth.mfa.enroll());
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await auth.mfa.verify(code, setup.factorId);
      setSetup(null);
      setCode("");
      toast("Two-step sign-in is on. You’ll need your phone each time you sign in.");
      reload();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(factorId) {
    if (!window.confirm("Turn off two-step sign-in? Your account will only be protected by your password.")) return;
    try {
      await auth.mfa.remove(factorId);
      toast("Two-step sign-in turned off.");
      reload();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  return (
    <section className="a-card">
      <h3>
        <ShieldCheck size={17} aria-hidden="true" /> Two-step sign-in
      </h3>
      {factors === null ? (
        <p className="a-help">Loading…</p>
      ) : verified.length ? (
        <>
          <p>
            <strong>On.</strong> Signing in needs your password and a code from your authenticator app. This protects the giving details even if
            your password leaks.
          </p>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => remove(verified[0].id)}>
            Turn off
          </button>
        </>
      ) : setup ? (
        <form onSubmit={confirm} className="mfa-setup">
          <ol className="simple-list">
            <li>
              Install <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> or any authenticator app on your phone.
            </li>
            <li>In the app, add an account and scan this code:</li>
          </ol>
          <img className="mfa-setup__qr" src={setup.qr} alt="QR code for your authenticator app" width="180" height="180" />
          <p className="a-help">
            Can’t scan? Type this key instead: <code>{setup.secret}</code>
          </p>
          <label className="a-field">
            <span>Enter the 6-digit code the app shows</span>
            <input
              className="a-input a-input--code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          <div className="editor__actions">
            <button type="submit" className="a-btn a-btn--primary" disabled={busy}>
              {busy ? "Checking…" : "Turn on"}
            </button>
            <button type="button" className="a-btn a-btn--ghost" onClick={() => setSetup(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p>
            <strong>Recommended for every admin.</strong> Anyone with your password could change the church’s UPI or bank details. Two-step
            sign-in also asks for a code from your phone.
          </p>
          <button type="button" className="a-btn a-btn--primary" onClick={start} disabled={busy}>
            {busy ? "Starting…" : "Set up two-step sign-in"}
          </button>
        </>
      )}
    </section>
  );
}

export function AccountPanel({ email }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function save(event) {
    event.preventDefault();
    if (form.newPassword.length < MIN_PASSWORD) return toast(`Use at least ${MIN_PASSWORD} characters.`, "error");
    if (form.newPassword !== form.confirm) return toast("The new passwords don’t match.", "error");
    setSaving(true);
    try {
      await auth.changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast("Password changed. Other devices have been signed out.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PanelHeader title="Account & security">
        Signed in as <strong>{email}</strong>. Every admin has their own account — please don’t share passwords.
      </PanelHeader>
      <TwoStepCard />
      <form className="a-card" onSubmit={save}>
        <h3>Change password</h3>
        <FieldGrid
          fields={[
            { name: "currentPassword", label: "Current password", type: "password", required: true, wide: true },
            { name: "newPassword", label: `New password (${MIN_PASSWORD}+ characters)`, type: "password", required: true, wide: true },
            { name: "confirm", label: "Confirm new password", type: "password", required: true, wide: true },
          ]}
          value={form}
          onChange={setForm}
        />
        <div className="editor__actions">
          <button type="submit" className="a-btn a-btn--primary" disabled={saving}>
            {saving ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
      <section className="a-card">
        <h3>Adding or removing admins</h3>
        <p className="a-help">
          For safety, admin access is managed by the website owner in the Supabase dashboard: invite the person under Authentication → Users, then
          run <code>select public.grant_admin(&apos;their@email.com&apos;);</code> in the SQL editor. The README has step-by-step instructions.
        </p>
      </section>
    </>
  );
}
