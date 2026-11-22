import { prettyTitle, setChurchTimeZone } from "./format.js";

export const DEFAULT_SETTINGS = {
  name: "Vine India",
  location: "",
  tagline: "",
  timeZone: "Asia/Kolkata",
  logoUrl: "",
  heroImage: "",
  announcementEnabled: false,
  announcementText: "",
  announcementLinkText: "",
  announcementLink: "",
  serviceTimes: [],
  address: "",
  mapEmbedUrl: "",
  mapDirectionsUrl: "",
  phone: "",
  prayerPhones: "",
  whatsapp: "",
  email: "",
  youtubeChannelId: "",
  youtubePlaylistId: "",
  youtubeUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  aboutStory: "",
  aboutMission: "",
  aboutVision: "",
  beliefs: [],
  givingIntro: "",
  upiId: "",
  upiQrImage: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankName: "",
  bankBranch: "",
  registrationNote: "",
  messageRetentionMonths: 12,
  pageText: {},
};

export const DEFAULT_LIVE = { isLive: false, videoUrl: "", title: "", speaker: "", description: "" };

const list = (value) => (Array.isArray(value) ? value : []);
const text = (value) => (value === null || value === undefined ? "" : value);

// YouTube is checked every minute; ignore a "live" reading older than this (e.g. from a cached copy).
const LIVE_FRESH_MS = 5 * 60_000;

/**
 * What's on YouTube right now. The admin's manual "We are live" switch always wins;
 * otherwise the automatic check of the channel decides.
 */
function resolveLive(manual, youtube, now = Date.now()) {
  const live = { ...DEFAULT_LIVE, ...(manual || {}) };
  const auto = youtube?.live;
  const fresh = auto?.checkedAt && now - Date.parse(auto.checkedAt) < LIVE_FRESH_MS;
  if (!live.isLive && fresh && auto.status === "live" && auto.videoId) {
    return { ...live, isLive: true, auto: true, videoUrl: `https://www.youtube.com/watch?v=${auto.videoId}`, title: live.title || prettyTitle(auto.title) };
  }
  return live;
}

/** The next scheduled YouTube stream, if the channel has one coming up. */
function resolveUpcoming(youtube, now = Date.now()) {
  const auto = youtube?.live;
  if (auto?.status !== "upcoming" || !auto.videoId || !auto.startsAt) return null;
  const starts = Date.parse(auto.startsAt);
  // Ignore streams that should have started over 3 hours ago (abandoned schedules) or are far off.
  if (!(starts > now - 3 * 3600_000 && starts < now + 14 * 86_400_000)) return null;
  return { videoId: auto.videoId, title: prettyTitle(auto.title), startsAt: auto.startsAt };
}

/** Fill in anything missing so pages never crash on a partially-filled database. */
export function normalizeSite(raw) {
  if (!raw || typeof raw !== "object") return null;
  const settings = { ...DEFAULT_SETTINGS };
  for (const [key, value] of Object.entries(raw.settings || {})) {
    settings[key] = Array.isArray(DEFAULT_SETTINGS[key]) ? list(value) : typeof DEFAULT_SETTINGS[key] === "string" ? text(value) : value;
  }
  setChurchTimeZone(settings.timeZone);
  return {
    ...raw,
    settings,
    live: resolveLive(raw.live, raw.youtube),
    upcomingStream: resolveUpcoming(raw.youtube),
    youtube: raw.youtube || {},
    sessions: list(raw.sessions),
    activities: list(raw.activities),
    ministries: list(raw.ministries),
    leaders: list(raw.leaders),
    gallery: list(raw.gallery),
  };
}
