import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CalendarDays, Inbox, Mail, MailOpen, Phone, Radio, Video, Youtube } from "lucide-react";
import { adminApi, api } from "../lib/api.js";
import { formatDate, formatTime, liveEmbed, nextOccurrence, toDate, youtubeId } from "../lib/format.js";
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

export function Dashboard({ data }) {
  const now = Date.now();
  const upcoming = data.sessions
    .map((s) => nextOccurrence(s, now))
    .filter((s) => (toDate(s.startsAt)?.getTime() ?? 0) > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const unread = data.messages.filter((m) => !m.read).length;
  const cards = [
    { to: "/admin/live", Icon: Radio, label: "Live status", value: data.live.isLive ? "LIVE NOW" : "Offline", hot: data.live.isLive },
    { to: "/admin/live", Icon: CalendarClock, label: "Upcoming sessions", value: upcoming.length },
    { to: "/admin/activities", Icon: CalendarDays, label: "Activities", value: data.activities.length },
    { to: "/admin/inbox", Icon: Inbox, label: "Unread messages", value: unread, hot: unread > 0 },
  ];
  return (
    <>
      <PanelHeader title={`Welcome back`}>Here’s what’s happening on the {data.settings.name} website.</PanelHeader>
      <div className="stat-grid">
        {cards.map(({ to, Icon, label, value, hot }) => (
          <Link key={label} to={to} className={`stat${hot ? " stat--hot" : ""}`}>
            <Icon size={20} aria-hidden="true" />
            <span className="stat__value">{value}</span>
            <span className="stat__label">{label}</span>
          </Link>
        ))}
      </div>
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
        <h3>Quick guide</h3>
        <ol className="simple-list">
          <li>
            <strong>Going live on Sunday?</strong> Open <Link to="/admin/live">Live & sessions</Link>, paste your YouTube live link and switch “We are live” on.
          </li>
          <li>
            <strong>Previous messages</strong> appear automatically once your YouTube channel is set in <Link to="/admin/settings">Site settings → YouTube</Link>.
          </li>
          <li>
            <strong>New event?</strong> Add it under <Link to="/admin/activities">Activities</Link> with a photo and date.
          </li>
          <li>
            <strong>Logo, address, map & service times</strong> live in <Link to="/admin/settings">Site settings</Link>.
          </li>
        </ol>
      </div>
    </>
  );
}

/* ---------------- Live & sessions ---------------- */

const sessionFields = [
  { name: "title", label: "Session title", required: true, placeholder: "Sunday Worship Service" },
  { name: "startsAt", label: "Date & start time", type: "datetime", required: true },
  { name: "repeatWeekly", label: "Repeats every week", help: "For regular services: the date moves forward automatically each week.", type: "checkbox" },
  { name: "speaker", label: "Speaker / preacher", placeholder: "Pastor …" },
  { name: "streamUrl", label: "Stream link (optional)", type: "url", placeholder: "https://youtube.com/live/…", help: "A YouTube, Zoom or other link where people can join." },
  { name: "description", label: "Short description", type: "textarea", rows: 3, wide: true },
];

export function LivePanel({ data, setData }) {
  const [live, setLive] = useState(data.live);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const preview = liveEmbed({ ...live, isLive: true }, data.settings);

  async function save(next = live) {
    setSaving(true);
    try {
      const saved = await adminApi.put("/live", next);
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
            <p className="a-help">When “We are live” is on, every page shows a LIVE banner and the Services page plays your stream.</p>
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
              help: data.settings.youtubeChannelId
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
            const when = nextOccurrence(s).startsAt;
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
  const [feedCount, setFeedCount] = useState(null);
  useEffect(() => {
    api
      .get("/api/sermons")
      .then((list) => setFeedCount(list.filter((s) => s.source === "youtube").length))
      .catch(() => setFeedCount(0));
  }, [data.settings.youtubeChannelId, data.settings.youtubePlaylistId]);

  const connected = data.settings.youtubeChannelId || data.settings.youtubePlaylistId;

  return (
    <>
      <PanelHeader title="Previous messages">The message library on the Services page combines your YouTube uploads with any messages you add here.</PanelHeader>
      <div className={`a-card a-callout${connected ? "" : " a-callout--warn"}`}>
        <Youtube size={22} aria-hidden="true" />
        <div>
          {connected ? (
            <>
              <strong>YouTube is connected.</strong> {feedCount === null ? "Checking…" : `${feedCount} recent videos are being shown automatically.`} New uploads appear within ~20 minutes.
            </>
          ) : (
            <>
              <strong>Connect your YouTube channel</strong> in <Link to="/admin/settings">Site settings → YouTube</Link> to show your latest services automatically.
            </>
          )}
          <p className="a-help">YouTube’s public feed shows the latest 15 videos. Add older or special messages below — they’ll stay in the library permanently with speaker and series details.</p>
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
      await adminApi.patch(`/messages/${message.id}`, { read });
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function remove(id) {
    try {
      await adminApi.delete(`/messages/${id}`);
      setMessages((list) => list.filter((m) => m.id !== id));
    } catch (error) {
      toast(error.message, "error");
    }
  }

  return (
    <>
      <PanelHeader title="Inbox">Messages and prayer requests sent from the Visit page. Only signed-in admins can see these.</PanelHeader>
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
                <a href={`tel:${m.phone}`}>
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
      { name: "tagline", label: "Tagline", wide: true },
      { name: "logoUrl", label: "Logo", type: "image", help: "Square PNG or SVG works best. Also used as the browser tab icon." },
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
      { name: "upiQrImage", label: "UPI QR code image", type: "image" },
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
      const saved = await adminApi.put("/settings", draft);
      setDraft(saved);
      setData((d) => ({ ...d, settings: saved }));
      toast("Settings saved.");
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

/* ---------------- Account ---------------- */

export function AccountPanel() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function save(event) {
    event.preventDefault();
    if (form.newPassword !== form.confirm) return toast("The new passwords don’t match.", "error");
    setSaving(true);
    try {
      await adminApi.changePassword(form);
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
      <PanelHeader title="Account">Change the admin password. Share it only with people who manage the website.</PanelHeader>
      <form className="a-card a-narrow" onSubmit={save}>
        <FieldGrid
          fields={[
            { name: "currentPassword", label: "Current password", type: "password", required: true, wide: true },
            { name: "newPassword", label: "New password (10+ characters)", type: "password", required: true, wide: true },
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
      <div className="a-card a-narrow a-callout">
        <Video size={20} aria-hidden="true" />
        <p className="a-help">
          Tip: bookmark <code>/admin</code> on your phone so you can switch the live stream on from the sound desk on Sunday morning.
        </p>
      </div>
    </>
  );
}
