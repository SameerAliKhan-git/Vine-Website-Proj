import { useMemo, useRef, useState } from "react";
import { CalendarPlus, Clock3, Mic2, PlayCircle, Radio, Search, Youtube } from "lucide-react";
import { Countdown, Loading, PageHero, VideoEmbed } from "../components/ui.jsx";
import {
  calendarLink,
  embedUrl,
  formatDate,
  formatTime,
  liveEmbed,
  localTimeHint,
  monthDay,
  safeUrl,
  upcomingSessions,
  weekdayName,
  youtubeChannelUrl,
  youtubeId,
} from "../lib/format.js";
import { useSermons, useSite } from "../lib/SiteContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

const PAGE_SIZE = 12;

function LiveSection({ site }) {
  const { live, settings, sessions } = site;
  const youtubeUrl = youtubeChannelUrl(settings);
  const src = liveEmbed(live, settings, site.youtube);
  const upcoming = upcomingSessions(sessions);
  const next = upcoming[0];

  if (src) {
    return (
      <section className="live section-pad" id="live" aria-labelledby="live-title">
        <div className="live__player">
          <VideoEmbed src={src} title={live.title || "Live service"} autoLoad />
        </div>
        <div className="live__info">
          <span className="live-badge">
            <span className="live-dot" aria-hidden="true" /> Live now
          </span>
          <h2 id="live-title">{live.title || "Live service"}</h2>
          {live.speaker && (
            <p className="live__speaker">
              <Mic2 size={15} aria-hidden="true" /> {live.speaker}
            </p>
          )}
          {live.description && <p>{live.description}</p>}
          {youtubeUrl && (
            <a className="arrow-link" href={youtubeUrl} target="_blank" rel="noreferrer">
              <span>Open on YouTube</span> <Youtube size={17} aria-hidden="true" />
            </a>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="live live--offline section-pad" id="live" aria-labelledby="live-title">
      <div className="live__offline-card">
        <span className="section-number">
          <Radio size={14} aria-hidden="true" /> LIVE STREAM
        </span>
        <h2 id="live-title">
          {next?.inProgress ? (
            <>
              Happening <em>now.</em>
            </>
          ) : (
            <>
              We’re not live <em>right now.</em>
            </>
          )}
        </h2>
        {next ? (
          <>
            {next.inProgress ? (
              <p>
                <strong>{next.title}</strong> started at {formatTime(next.startsAt)}
                {localTimeHint(next.startsAt)}. When it’s streamed on YouTube, the live video appears here by itself.
              </p>
            ) : (
              <p>
                Our next service is <strong>{next.title}</strong> on{" "}
                {formatDate(next.startsAt, { weekday: true })} at {formatTime(next.startsAt)}
                {localTimeHint(next.startsAt)}. This page will switch to
                the live stream automatically when we go live.
              </p>
            )}
            {!next.inProgress && <Countdown target={next.time} />}
          </>
        ) : (
          <p>Upcoming service times will be posted here. In the meantime, enjoy one of our previous messages below.</p>
        )}
        {site.upcomingStream && (
          <p className="live__upcoming">
            <Youtube size={17} aria-hidden="true" />
            <span>
              Next live stream: <strong>{site.upcomingStream.title || "Sunday service"}</strong>,{" "}
              {formatDate(site.upcomingStream.startsAt, { weekday: true })} at {formatTime(site.upcomingStream.startsAt)}
              {localTimeHint(site.upcomingStream.startsAt)}.{" "}
              <a href={`https://www.youtube.com/watch?v=${site.upcomingStream.videoId}`} target="_blank" rel="noopener noreferrer">
                Set a reminder on YouTube
              </a>
            </span>
          </p>
        )}
      </div>
      <figure className="live__offline-photo">
        <img src="/gallery/thumbs/vine-30.webp" alt="The church worshipping together on a Sunday" loading="lazy" decoding="async" />
        <figcaption>
          <Radio size={14} aria-hidden="true" /> Sunday worship, streamed live
        </figcaption>
      </figure>
    </section>
  );
}

function UpcomingSessions({ site }) {
  const upcoming = upcomingSessions(site.sessions);
  return (
    <section className="sessions section-pad" id="upcoming" aria-labelledby="upcoming-title">
      <div className="section-heading">
        <div>
          <span className="section-number">UPCOMING SESSIONS</span>
          <h2 id="upcoming-title">
            Join us <em>this week.</em>
          </h2>
        </div>
        <div className="service-times">
          {site.settings.serviceTimes.map((service, index) => (
            <span key={index}>
              <Clock3 size={14} aria-hidden="true" />
              <strong>{service.day}</strong> {service.time}
              {(service.place || service.label) && <em> · {service.place || service.label}</em>}
            </span>
          ))}
        </div>
      </div>
      {upcoming.length ? (
        <ol className="session-list">
          {upcoming.map((session) => {
            const md = monthDay(session.startsAt);
            const streamUrl = safeUrl(session.streamUrl);
            return (
              <li className="session" key={session.id}>
                <span className="session__date">
                  <strong>{md?.day}</strong>
                  <span>{md?.month}</span>
                </span>
                <span className="session__body">
                  <span className="session__when">
                    {session.inProgress ? (
                      <span className="live-badge live-badge--small">
                        <span className="live-dot" aria-hidden="true" /> Happening now
                      </span>
                    ) : (
                      `${weekdayName(session.startsAt)} · ${formatTime(session.startsAt)}${localTimeHint(session.startsAt)}`
                    )}
                  </span>
                  <h3>
                    {session.title}
                    {session.repeatWeekly && <span className="session__weekly">Every week</span>}
                  </h3>
                  {session.speaker && (
                    <span className="session__speaker">
                      <Mic2 size={13} aria-hidden="true" /> {session.speaker}
                    </span>
                  )}
                  {session.description && <p>{session.description}</p>}
                </span>
                <span className="session__actions">
                  {streamUrl && (
                    <a className="button button--small" href={streamUrl} target="_blank" rel="noreferrer">
                      <PlayCircle size={15} aria-hidden="true" /> {youtubeId(streamUrl) ? "YouTube link" : "Join online"}
                    </a>
                  )}
                  <a className="session__calendar" href={calendarLink(session, site.settings)} target="_blank" rel="noreferrer">
                    <CalendarPlus size={15} aria-hidden="true" /> Add to calendar
                  </a>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="empty-state">New sessions will be announced soon.</p>
      )}
    </section>
  );
}

function PreviousMessages({ settings }) {
  const youtubeUrl = youtubeChannelUrl(settings);
  const { sermons, loading, error } = useSermons();
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState(null);
  const playerRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sermons;
    return sermons.filter((s) =>
      [s.title, s.speaker, s.series, s.scripture, s.description].some((field) => field?.toLowerCase().includes(q)),
    );
  }, [sermons, query]);

  const selected = sermons.find((s) => s.id === selectedId) || sermons[0];

  const play = (sermon) => {
    setSelectedId(sermon.id);
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="messages section-pad" id="messages" aria-labelledby="messages-title">
      <div className="section-heading">
        <div>
          <span className="section-number">MESSAGE LIBRARY</span>
          <h2 id="messages-title">
            Previous <em>messages.</em>
          </h2>
        </div>
        <p>Missed a Sunday? Catch up on our services and teaching, anytime and anywhere.</p>
      </div>

      {loading && <Loading label="Loading messages…" />}
      {!loading && (error || sermons.length === 0) && (
        <div className="messages-empty">
          <img src="/gallery/thumbs/vine-14.webp" alt="" loading="lazy" decoding="async" />
          <div className="messages-empty__copy">
            <h3>{error ? "Messages couldn’t load just now." : "Our message library is coming soon."}</h3>
            <p>Sunday sermons and teaching will appear here. Until then, join us in person or follow along online.</p>
            {youtubeUrl && (
              <a className="button" href={youtubeUrl} target="_blank" rel="noopener noreferrer">
                <Youtube size={17} aria-hidden="true" /> Visit our YouTube channel
              </a>
            )}
          </div>
        </div>
      )}

      {selected && (
        <div className="featured-message" ref={playerRef}>
          <VideoEmbed
            key={selected.id}
            src={embedUrl(selected.videoId, { autoplay: true })}
            title={selected.title}
            thumbnail={selectedId ? null : selected.thumbnail}
          />
          <div className="featured-message__info">
            <span className="section-number">{selectedId ? "NOW PLAYING" : "LATEST MESSAGE"}</span>
            <h3>{selected.title}</h3>
            <div className="message-meta">
              {selected.speaker && <span>{selected.speaker}</span>}
              {selected.date && <span>{formatDate(selected.date)}</span>}
              {selected.series && <span>{selected.series}</span>}
              {selected.scripture && <span>{selected.scripture}</span>}
            </div>
            {selected.description && <p>{selected.description}</p>}
            <a
              className="arrow-link"
              href={`https://www.youtube.com/watch?v=${selected.videoId}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>Watch on YouTube</span> <Youtube size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      {sermons.length > 0 && (
        <>
          <div className="message-toolbar">
            <label className="search-field">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search messages</span>
              <input
                type="search"
                placeholder="Search by title, speaker, series or scripture"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisible(PAGE_SIZE);
                }}
              />
            </label>
            <span className="message-toolbar__count">
              {filtered.length} message{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="sermon-grid">
            {filtered.slice(0, visible).map((sermon) => (
              <button
                type="button"
                className={`sermon-card${selected?.id === sermon.id ? " sermon-card--active" : ""}`}
                key={sermon.id}
                onClick={() => play(sermon)}
              >
                <span className="sermon-card__thumb">
                  <img src={sermon.thumbnail} alt="" loading="lazy" />
                  <PlayCircle size={38} strokeWidth={1.3} aria-hidden="true" />
                </span>
                <span className="sermon-card__copy">
                  <span className="sermon-card__date">
                    {formatDate(sermon.date)}
                    {sermon.series && ` · ${sermon.series}`}
                  </span>
                  <span className="sermon-card__title">{sermon.title}</span>
                  {sermon.speaker && <span className="sermon-card__speaker">{sermon.speaker}</span>}
                </span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && <p className="empty-state">No messages match “{query}”.</p>}
          <div className="messages__more">
            {visible < filtered.length && (
              <button type="button" className="button" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Show more messages
              </button>
            )}
            {youtubeUrl && (
              <a className="arrow-link" href={youtubeUrl} target="_blank" rel="noreferrer">
                <span>See everything on our YouTube channel</span> <Youtube size={17} aria-hidden="true" />
              </a>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default function Services() {
  usePageTitle("Services");
  const { site } = useSite();
  return (
    <>
      <PageHero page="services" image="/gallery/vine-09.webp" eyebrow="SERVICES · WATCH & WORSHIP" title="Worship with us," accent="wherever you are.">
        Join our services in person or online. Watch live, see what’s coming up, and catch up on previous messages.
      </PageHero>
      <LiveSection site={site} />
      <UpcomingSessions site={site} />
      <PreviousMessages settings={site.settings} />
    </>
  );
}
