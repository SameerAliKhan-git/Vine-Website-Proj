// Saves a copy of the church's public website content into the app bundle, so pages
// appear instantly (and still work if Supabase is slow or unreachable). The live data
// still loads in the background and replaces it within a second or two.
// Runs automatically before every build; on failure it keeps the previous copy.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = new URL("../src/lib/site-snapshot.json", import.meta.url);

function env(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

const url = env("VITE_SUPABASE_URL").replace(/\/+$/, "");
const key = env("VITE_SUPABASE_PUBLISHABLE_KEY") || env("VITE_SUPABASE_ANON_KEY");

try {
  if (!url || !key) throw new Error("Supabase URL or key is not set");
  const res = await fetch(`${url}/rest/v1/rpc/get_site`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // Never bake a "we're live now" banner into the bundle.
  data.live = { ...(data.live || {}), isLive: false };
  if (data.youtube) delete data.youtube.live;
  writeFileSync(OUT, `${JSON.stringify(data, null, 1)}\n`);
  console.log("site snapshot updated");
} catch (error) {
  if (!existsSync(OUT)) writeFileSync(OUT, "null\n");
  console.warn(`site snapshot not refreshed (${error.message}); keeping the previous copy`);
}
