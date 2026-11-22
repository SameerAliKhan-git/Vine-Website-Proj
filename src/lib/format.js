const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function youtubeId(input) {
  const value = String(input || "").trim();
  if (!value) return "";
  if (ID_PATTERN.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1, 12);
      return ID_PATTERN.test(id) ? id : "";
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && ID_PATTERN.test(v)) return v;
      const match = url.pathname.match(/\/(?:embed|live|shorts|v)\/([A-Za-z0-9_-]{11})/);
      if (match) return match[1];
    }
  } catch {
    /* not a URL */
  }
  return "";
}

/* ------------------------------------------------------------ link safety */

const UNSAFE_CHARS = /[\s"'<>\\]/;

/** Only http(s), mailto:, tel: and same-site paths. Anything else (javascript:, data:, //host) becomes "". */
export function safeUrl(value) {
  const v = String(value || "").trim();
  if (!v || UNSAFE_CHARS.test(v)) return "";
  if (/^https?:\/\/[^/]/i.test(v)) return v;
  if (/^\/(?!\/)/.test(v)) return v;
  if (/^(mailto|tel):/i.test(v)) return v;
  return "";
}

/** CSS background value for an image link, or "" if the link isn't safe. */
export function cssUrl(value) {
  const url = safeUrl(value);
  return url ? `url("${url}")` : "";
}

/** Only Google Maps embeds may be framed. */
export function mapEmbedSrc(value) {
  const url = safeUrl(value);
  return /^https:\/\/(www\.|maps\.)?google\.[a-z.]{2,10}\/maps(\/embed)?\?/i.test(url) ? url : "";
}

export const isInternal = (url) => url.startsWith("/");

/* ------------------------------------------------------------- time zones */
// Admins type service times in the church's local time ("2026-12-06T10:00").
// We interpret them in the church's time zone so online viewers abroad get the right
// countdown, and display them in church time with the zone name when it differs.

let churchTimeZone = "Asia/Kolkata";

export function setChurchTimeZone(timeZone) {
  if (!timeZone) return;
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    churchTimeZone = timeZone;
  } catch {
    /* invalid zone name: keep the previous one */
  }
}
export const getChurchTimeZone = () => churchTimeZone;

/**
 * True when the visitor's clock differs from church time at that moment. Compares UTC
 * offsets, not zone names: browsers may report "Asia/Calcutta" for "Asia/Kolkata".
 */
function viewerIsElsewhere(date = new Date()) {
  try {
    return zoneOffsetMs(churchTimeZone, date.getTime()) !== -date.getTimezoneOffset() * 60_000;
  } catch {
    return false;
  }
}

function zoneOffsetMs(timeZone, utcMs) {
  const base = Math.floor(utcMs / 1000) * 1000;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(base));
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second")) - base;
}

/** "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" (church wall-clock time), or a full ISO timestamp, to a Date. */
export function toDate(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(String(value));
  if (!match) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const [, y, m, d, hh = "0", mm = "0"] = match;
  const wall = Date.UTC(+y, +m - 1, +d, +hh, +mm);
  let utc = wall - zoneOffsetMs(churchTimeZone, wall);
  utc = wall - zoneOffsetMs(churchTimeZone, utc); // second pass handles DST edges
  return new Date(utc);
}

export function formatDate(value, options = {}) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-IN", {
    timeZone: churchTimeZone,
    weekday: options.weekday ? "long" : undefined,
    day: "numeric",
    month: "short",
    year: options.year === false ? undefined : "numeric",
  });
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleTimeString("en-IN", {
    timeZone: churchTimeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: viewerIsElsewhere(date) ? "short" : undefined,
  });
}

/** " (7:30 am your time)" for visitors outside the church's time zone, else "". */
export function localTimeHint(value) {
  const date = toDate(value);
  if (!date || !viewerIsElsewhere(date)) return "";
  const local = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const sameDay =
    date.toLocaleDateString("en-CA", { timeZone: churchTimeZone }) === date.toLocaleDateString("en-CA");
  return ` (${local}${sameDay ? "" : ` ${date.toLocaleDateString("en-IN", { weekday: "short" })}`} your time)`;
}

export function monthDay(value) {
  const date = toDate(value);
  if (!date) return null;
  return {
    month: date.toLocaleDateString("en-IN", { timeZone: churchTimeZone, month: "short" }).toUpperCase(),
    day: Number(date.toLocaleDateString("en-IN", { timeZone: churchTimeZone, day: "numeric" })),
  };
}

export const weekdayName = (value) =>
  toDate(value)?.toLocaleDateString("en-IN", { timeZone: churchTimeZone, weekday: "long" }) || "";

const SESSION_LENGTH_MS = 2 * 3600_000;
const WEEK_MS = 7 * 86_400_000;

/** For weekly sessions, move forward to the next occurrence that hasn't finished. Adds `time` (ms). */
export function nextOccurrence(session, now = Date.now()) {
  const start = toDate(session.startsAt);
  if (!start) return { ...session, time: null };
  let time = start.getTime();
  if (session.repeatWeekly && time + SESSION_LENGTH_MS <= now) {
    time += Math.ceil((now - SESSION_LENGTH_MS - time + 1) / WEEK_MS) * WEEK_MS;
  }
  return { ...session, startsAt: session.repeatWeekly ? new Date(time).toISOString() : session.startsAt, time };
}

/** Sessions that haven't finished yet, soonest first, with an `inProgress` flag. */
export function upcomingSessions(sessions, now = Date.now()) {
  return sessions
    .map((session) => nextOccurrence(session, now))
    .filter((session) => session.time && session.time + SESSION_LENGTH_MS > now)
    .sort((a, b) => a.time - b.time)
    .map((session) => ({ ...session, inProgress: session.time <= now }));
}

/** Today's date in the church's time zone, as YYYY-MM-DD. */
export const churchToday = () => new Date().toLocaleDateString("en-CA", { timeZone: churchTimeZone });

/** Activities split into upcoming (incl. undated) and past. */
export function splitActivities(activities) {
  const today = churchToday();
  const upcoming = [];
  const past = [];
  for (const activity of activities) {
    if (activity.date && activity.date < today) past.push(activity);
    else upcoming.push(activity);
  }
  upcoming.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
  past.sort((a, b) => b.date.localeCompare(a.date));
  return { upcoming, past };
}

/** "Add to Google Calendar" link for a session (UTC times, so it's right in any zone). */
export function calendarLink(session, settings, origin = window.location.origin) {
  const start = new Date(session.time ?? toDate(session.startsAt));
  const end = new Date(start.getTime() + SESSION_LENGTH_MS);
  const stamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${session.title} · ${settings.name}`,
    dates: `${stamp(start)}/${stamp(end)}`,
    ctz: churchTimeZone,
    details: `${session.description || ""}\n\nWatch online: ${origin}/services`.trim(),
    location: settings.address || settings.name,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/* --------------------------------------------------------------- contacts */

/** The email setting can hold several addresses separated by commas. */
export function emailList(value) {
  return String(value || "")
    .split(/[,;\s]+/)
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

/** Comma-separated phone numbers. */
export function phoneList(value) {
  return String(value || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, "")}`;

export const mapSearchUrl = (place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

/* ---------------------------------------------------------------- YouTube */

export function embedUrl(videoId, { autoplay = false } = {}) {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}`;
}

/** The church's YouTube channel id (UC…), resolved by the sync job or typed directly. */
export function channelId(settings, youtube) {
  if (youtube?.channelId) return youtube.channelId;
  return String(settings?.youtubeChannelId || "").match(/UC[A-Za-z0-9_-]{22}/)?.[0] || "";
}

/** What the live player should show right now, or null. */
export function liveEmbed(live, settings, youtube) {
  if (!live?.isLive) return null;
  const id = youtubeId(live.videoUrl);
  if (id) return embedUrl(id, { autoplay: true });
  const channel = channelId(settings, youtube);
  // live_stream?channel= is only supported on youtube.com, not youtube-nocookie.com.
  if (channel) return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channel)}&autoplay=1`;
  return null;
}

const CHURCH_TAG = /^(the\s*)?vine\s*india$/i;

/**
 * Tidies YouTube titles for the website: "SUNDAY SERVICE/ VINEINDIA/22-11-26 #faith"
 * becomes "Sunday Service · 22-11-26". Only changes ALL-CAPS titles' case.
 */
export function prettyTitle(title) {
  const raw = String(title || "").replace(/\s#[^\s#]*/g, "").replace(/\s+#\s*/g, " ").trim();
  const parts = raw
    .split(/\s*[/|]\s*/)
    .map((p) => p.trim())
    .filter((p) => p && !CHURCH_TAG.test(p.replace(/\s+/g, " ")));
  let text = (parts.length ? parts : [raw]).join(" · ");
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters && letters === letters.toUpperCase()) {
    const small = new Set(["a", "an", "and", "the", "of", "in", "on", "for", "to", "with", "at", "by"]);
    text = text
      .toLowerCase()
      .replace(/[a-z][a-z']*/g, (word, offset) => (offset > 0 && small.has(word) ? word : word[0].toUpperCase() + word.slice(1)))
      .replace(/\bPas\b/g, "Ps.")
      .replace(/\bBro\b/g, "Bro.");
  }
  return text || String(title || "");
}

/** Merge admin-added messages with the YouTube feed. Admin entries win (they carry speaker/series). */
export function mergeSermons({ manual = [], youtube = [] } = {}) {
  const byVideo = new Map();
  for (const video of youtube) {
    byVideo.set(video.videoId, { ...video, title: prettyTitle(video.title), id: `yt-${video.videoId}`, source: "youtube" });
  }
  for (const sermon of manual) {
    const videoId = youtubeId(sermon.videoUrl);
    if (!videoId) continue;
    const fromFeed = byVideo.get(videoId);
    byVideo.set(videoId, {
      ...fromFeed,
      ...sermon,
      date: sermon.date || fromFeed?.date || "",
      description: sermon.description || fromFeed?.description || "",
      videoId,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      source: "manual",
    });
  }
  return [...byVideo.values()].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/** The church's YouTube channel page: the saved link, or one built from the channel handle/ID. */
export function youtubeChannelUrl(settings) {
  const saved = safeUrl(settings?.youtubeUrl);
  if (saved) return saved;
  const id = String(settings?.youtubeChannelId || "").trim();
  if (/^@[\w.-]{3,100}$/.test(id)) return `https://www.youtube.com/${id}`;
  if (/^UC[\w-]{22}$/.test(id)) return `https://www.youtube.com/channel/${id}`;
  return "";
}

/** Smaller copy of one of the site's own gallery photos, for grids and cards (full size stays for the lightbox). */
export function thumbUrl(url) {
  const safe = safeUrl(url);
  const match = /^\/gallery\/(vine-\d+\.webp)$/.exec(safe);
  return match ? `/gallery/thumbs/${match[1]}` : safe;
}

// Church photos used when a ministry or event has no picture of its own, so no box is ever empty.
const FALLBACK_PHOTOS = ["/gallery/thumbs/vine-16.webp", "/gallery/thumbs/vine-22.webp", "/gallery/thumbs/vine-27.webp", "/gallery/thumbs/vine-24.webp"];

export function photoOrFallback(url, index = 0) {
  return thumbUrl(url) || FALLBACK_PHOTOS[Math.abs(index) % FALLBACK_PHOTOS.length];
}
