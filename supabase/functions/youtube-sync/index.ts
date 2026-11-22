// Keeps the website in step with the church's YouTube channel (no API key needed):
//  * the "Previous messages" library, from YouTube's public RSS feed (every 10 minutes), and
//  * live streams: whether the channel is live right now, or has a stream scheduled
//    (checked every minute with { "mode": "live" }), so the site switches to the live
//    player on its own.
// Admins can force a sync from the admin panel. Videos are kept after they drop out of
// the feed, so the library grows over time.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const MIN_INTERVAL_MS = 9 * 60_000;
const MIN_LIVE_INTERVAL_MS = 40_000;
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; ChurchWebsiteSync/1.0)",
  "Accept-Language": "en",
  Cookie: "CONSENT=YES+1",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function playlistIdFrom(input: string) {
  const value = input.trim();
  if (!value) return "";
  try {
    const list = new URL(value).searchParams.get("list");
    if (list) return list;
  } catch {
    /* not a URL */
  }
  return /^[A-Za-z0-9_-]{12,}$/.test(value) ? value : "";
}

async function channelIdFrom(input: string) {
  const value = input.trim();
  if (!value) return "";
  const direct = value.match(/(UC[A-Za-z0-9_-]{22})/);
  if (direct) return direct[1];

  let url: string;
  if (/^https?:\/\//i.test(value)) url = value;
  else url = `https://www.youtube.com/${value.startsWith("@") ? value : `@${value}`}`;
  const host = new URL(url).hostname.replace(/^www\.|^m\./, "");
  if (host !== "youtube.com") throw new Error("The YouTube channel must be a youtube.com link or @handle.");

  const html = await fetch(url, { headers: BROWSER_HEADERS }).then((r) => {
    if (!r.ok) throw new Error(`YouTube returned ${r.status} for the channel page.`);
    return r.text();
  });
  const match =
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/) ||
    html.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/) ||
    html.match(/itemprop="channelId" content="(UC[A-Za-z0-9_-]{22})"/) ||
    html.match(/"channelId":"(UC[A-Za-z0-9_-]{22})"/);
  if (!match) throw new Error("Couldn’t find that YouTube channel. Paste the channel link from your browser’s address bar.");
  return match[1];
}

function parseFeed(xml: string, sourceKey: string) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries
    .map((entry) => {
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
      if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
      // Shorts (quick highlight clips) don't belong in the sermon library.
      if (/youtube\.com\/shorts\//.test(entry)) return null;
      return {
        video_id: videoId,
        title: decode(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "Untitled"),
        description: decode(entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] || "").slice(0, 2000),
        published_at: entry.match(/<published>([^<]+)<\/published>/)?.[1] || null,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        source_key: sourceKey,
        fetched_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

/** Pulls a JSON object assigned in YouTube's page script, e.g. `var ytInitialPlayerResponse = {...};`. */
function extractPlayerResponse(html: string) {
  const at = html.search(/(?:var\s+|window\[["'])ytInitialPlayerResponse(?:["']\])?\s*=\s*\{/);
  if (at < 0) return null;
  const start = html.indexOf("{", at);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

type LiveState = { status: "live" | "upcoming" | "none"; videoId?: string; title?: string; startsAt?: string | null; checkedAt: string };

/** Asks YouTube what the channel's /live page shows right now. */
async function checkLive(channelId: string): Promise<LiveState> {
  const checkedAt = new Date().toISOString();
  if (!channelId) return { status: "none", checkedAt };
  const res = await fetch(`https://www.youtube.com/channel/${channelId}/live`, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`YouTube returned ${res.status} for the live page.`);
  const player = extractPlayerResponse(await res.text());
  const details = player?.videoDetails;
  // No stream at all, or (defensively) a video from some other channel.
  if (!details?.videoId || (details.channelId && details.channelId !== channelId) || !/^[A-Za-z0-9_-]{11}$/.test(details.videoId)) {
    return { status: "none", checkedAt };
  }
  const playability = player.playabilityStatus || {};
  const broadcast = player.microformat?.playerMicroformatRenderer?.liveBroadcastDetails || {};
  const base = { videoId: details.videoId, title: String(details.title || "").slice(0, 200), checkedAt };
  if ((details.isLive && playability.status === "OK") || broadcast.isLiveNow === true) {
    return { status: "live", ...base, startsAt: broadcast.startTimestamp || null };
  }
  const scheduled = playability.liveStreamability?.liveStreamabilityRenderer?.offlineSlate?.liveStreamOfflineSlateRenderer?.scheduledStartTime;
  if (details.isUpcoming && scheduled && /^\d+$/.test(scheduled)) {
    return { status: "upcoming", ...base, startsAt: new Date(Number(scheduled) * 1000).toISOString() };
  }
  return { status: "none", checkedAt };
}

async function isAdminRequest(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await supabase.auth.getUser(token);
  if (!data?.user) return false;
  const { data: row } = await supabase.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return Boolean(row);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const [{ data: settingsRow }, { data: stateRow }] = await Promise.all([
    supabase.from("site_config").select("data").eq("key", "settings").single(),
    supabase.from("site_config").select("data").eq("key", "youtube").single(),
  ]);
  const settings = settingsRow?.data || {};
  const state = stateRow?.data || {};

  const body = await req.json().catch(() => ({}));
  const force = body?.force === true && (await isAdminRequest(req));

  // Fast path, every minute: only refresh the live status.
  if (body?.mode === "live" && !force) {
    const lastLive = state.live?.checkedAt ? Date.parse(state.live.checkedAt) : 0;
    if (!state.channelId) return reply(200, { skipped: "no channel yet" });
    if (Date.now() - lastLive < MIN_LIVE_INTERVAL_MS) return reply(200, { skipped: "checked recently", live: state.live });
    try {
      const live = await checkLive(state.channelId);
      // Merge into the latest stored state so a feed sync running at the same time isn't undone.
      const { data: fresh } = await supabase.from("site_config").select("data").eq("key", "youtube").single();
      await supabase.from("site_config").update({ data: { ...(fresh?.data || state), live } }).eq("key", "youtube");
      return reply(200, { ok: true, live });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("live check failed", message);
      return reply(200, { ok: false, error: message });
    }
  }

  const last = state.lastSync ? Date.parse(state.lastSync) : 0;
  const configKey = `${settings.youtubeChannelId || ""}|${settings.youtubePlaylistId || ""}`;
  if (!force && configKey === state.configKey && Date.now() - last < MIN_INTERVAL_MS) {
    return reply(200, { skipped: "synced recently", ...state });
  }

  const saveState = (data: Record<string, unknown>) =>
    supabase.from("site_config").update({ data: { ...data, configKey, lastSync: new Date().toISOString() } }).eq("key", "youtube");

  try {
    const playlistId = playlistIdFrom(settings.youtubePlaylistId || "");
    // Resolve the channel even when a playlist is set: the live player needs the channel id.
    const channelId = state.configKey === configKey && state.channelId ? state.channelId : await channelIdFrom(settings.youtubeChannelId || "");

    if (!playlistId && !channelId) {
      await saveState({});
      return reply(200, { ok: true, count: 0, note: "No YouTube channel or playlist set." });
    }

    const sourceKey = playlistId ? `playlist:${playlistId}` : `channel:${channelId}`;
    const feedUrl = playlistId
      ? `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`
      : `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
    const feed = await fetch(feedUrl, { headers: BROWSER_HEADERS });
    if (!feed.ok) throw new Error(`YouTube feed returned ${feed.status}. Check the channel or playlist link.`);
    const live = await checkLive(channelId).catch(() => state.live || null);
    // A scheduled stream that hasn't started yet shows up in the feed: leave it out of the
    // library until it has actually aired (it's shown as "upcoming" on the Services page instead).
    const notYetAired = live?.status === "upcoming" || live?.status === "live" ? live.videoId : null;
    const videos = parseFeed(await feed.text(), sourceKey).filter((v) => v && v.video_id !== notYetAired);
    if (notYetAired) await supabase.from("youtube_videos").delete().eq("video_id", notYetAired);

    if (videos.length) {
      const { error } = await supabase.from("youtube_videos").upsert(videos, { onConflict: "video_id" });
      if (error) throw error;
    }
    await supabase.from("youtube_videos").delete().neq("source_key", sourceKey);
    const { count } = await supabase.from("youtube_videos").select("*", { count: "exact", head: true }).eq("source_key", sourceKey);

    const next = { sourceKey, channelId, playlistId, count: count ?? videos.length, lastError: null, live };
    await saveState(next);
    return reply(200, { ok: true, ...next });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("youtube sync failed", message);
    // Keep the previous good state only if the settings haven't changed since.
    await saveState({ ...(state.configKey === configKey ? state : {}), lastError: message });
    return reply(200, { ok: false, error: message });
  }
});
