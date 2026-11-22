// Contact & prayer-request form handler.
// Public endpoint (verify_jwt = false): it does its own spam protection —
// honeypot, optional Cloudflare Turnstile, consent check and a per-IP rate limit —
// then stores the message with the service role. Visitors can never read messages.
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const MAX_PER_HOUR = 5;
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "*").split(",").map((s) => s.trim()).filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allow = allowedOrigins.includes("*") ? "*" : allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function reply(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendEmail(subject: string, body: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  const to = (Deno.env.get("NOTIFY_EMAIL") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!key || !to.length) return;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("NOTIFY_FROM") || "Church website <onboarding@resend.dev>",
      to,
      subject,
      text: body,
    }),
  });
  if (!response.ok) console.error("email failed", response.status, await response.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "Method not allowed." });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply(req, 400, { error: "Invalid request." });
  }

  // Honeypot: bots fill the hidden "website" field. Pretend it worked.
  if (text(body.website, 200)) return reply(req, 200, { ok: true });

  const type = body.type === "prayer" ? "prayer" : "contact";
  const name = text(body.name, 120);
  const email = text(body.email, 200);
  const phone = text(body.phone, 40);
  const message = text(body.message, 4000);

  if (!name || !message) return reply(req, 400, { error: "Please add your name and a message." });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(req, 400, { error: "That email address doesn’t look right." });
  if (body.consent !== true) {
    return reply(req, 400, { error: "Please tick the box to let us store your message." });
  }

  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (turnstileSecret) {
    const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: turnstileSecret, response: text(body.turnstileToken, 4096), remoteip: ip }),
    }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!check.success) return reply(req, 400, { error: "Please complete the spam check and try again." });
  }

  const ipHash = await sha256(`${ip}|${Deno.env.get("RATE_LIMIT_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from("contact_attempts")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return reply(req, 429, { error: "You’ve sent several messages in a short time. Please try again in an hour, or give us a call." });
  }
  await supabase.from("contact_attempts").insert({ ip_hash: ipHash });

  const { error } = await supabase.from("messages").insert({
    type,
    name,
    email: email || null,
    phone: phone || null,
    message,
    consent: true,
  });
  if (error) {
    console.error("insert failed", error);
    return reply(req, 500, { error: "We couldn’t send your message right now. Please try again or call us." });
  }

  const inbox = `${Deno.env.get("SITE_URL") || ""}/admin/inbox`;
  try {
    if (type === "prayer") {
      // Prayer requests are sensitive: the email only says one arrived.
      await sendEmail(
        `New prayer request from ${name}`,
        `A new prayer request was sent through the church website by ${name}.\n\nFor privacy, the request itself is not included in this email. Read it in the admin inbox:\n${inbox}`,
      );
    } else {
      await sendEmail(
        `New message from ${name}`,
        `${name} sent a message through the church website.\n\nEmail: ${email || "—"}\nPhone: ${phone || "—"}\n\n${message}\n\nReply or manage it in the admin inbox:\n${inbox}`,
      );
    }
  } catch (err) {
    console.error("notify failed", err);
  }

  return reply(req, 200, { ok: true });
});
