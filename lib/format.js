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

/** Local "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD" to a Date (in the visitor's time zone). */
export function toDate(value) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, options = {}) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-IN", {
    weekday: options.weekday ? "long" : undefined,
    day: "numeric",
    month: "short",
    year: options.year === false ? undefined : "numeric",
  });
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function monthDay(value) {
  const date = toDate(value);
  if (!date) return null;
  return {
    month: date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
    day: date.getDate(),
  };
}

const SESSION_LENGTH_MS = 2 * 3600_000;

function toLocalString(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** For weekly sessions, move the date forward to the next occurrence that hasn't finished. */
export function nextOccurrence(session, now = Date.now()) {
  const start = toDate(session.startsAt);
  if (!start || !session.repeatWeekly) return session;
  while (start.getTime() + SESSION_LENGTH_MS <= now) start.setDate(start.getDate() + 7);
  return { ...session, startsAt: toLocalString(start) };
}

/** Sessions that haven't finished yet, soonest first, with an `inProgress` flag. */
export function upcomingSessions(sessions, now = Date.now()) {
  return sessions
    .map((session) => nextOccurrence(session, now))
    .map((session) => ({ ...session, time: toDate(session.startsAt)?.getTime() ?? null }))
    .filter((session) => session.time && session.time + SESSION_LENGTH_MS > now)
    .sort((a, b) => a.time - b.time)
    .map((session) => ({ ...session, inProgress: session.time <= now }));
}

/** Activities split into upcoming (incl. undated) and past. */
export function splitActivities(activities) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = [];
  const past = [];
  for (const activity of activities) {
    const date = toDate(activity.date);
    if (date && date < today) past.push(activity);
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

/** The email setting can hold several addresses separated by commas. */
export function emailList(value) {
  return String(value || "")
    .split(/[,;\s]+/)
    .filter((e) => e.includes("@"));
}

/** Comma-separated phone numbers. */
export function phoneList(value) {
  return String(value || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export const mapSearchUrl = (place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

export function embedUrl(videoId, { autoplay = false } = {}) {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}

/** What the live player should show right now, or null. */
export function liveEmbed(live, settings) {
  if (!live?.isLive) return null;
  const id = youtubeId(live.videoUrl);
  if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  if (settings?.youtubeChannelId) {
    return `https://www.youtube.com/embed/live_stream?channel=${settings.youtubeChannelId}&autoplay=1`;
  }
  return null;
}
