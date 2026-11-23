// People: lets admins create and manage sign-in accounts for church members and other admins
// from the admin panel. Uses the service role, so every request is checked first:
// the caller must be an admin (with two-step verification completed if they've set it up).
//
// Roles
//   member: app_metadata.role = "member" (only the server can set app_metadata)
//   admin:  a row in public.admins (full editing rights), plus app_metadata.role = "admin"
//
// New accounts get a temporary password that the admin passes on; the person is asked
// to choose their own password the first time they sign in.
//
// First admin: while there are no admins at all, "bootstrap" creates one, but only with
// the SETUP_CODE secret that the website owner set in the Supabase dashboard. Once an
// admin exists, bootstrap is refused for good.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const service = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (status: number, error: string) => reply(status, { error });

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const ROLES = new Set(["member", "admin"]);

/** Readable temporary password, e.g. "vine-7km2-q9tx-4hpa". */
function tempPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  return `vine-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

async function callerFrom(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(authHeader)) return null;
  // Ask the database as the caller: is_admin() also enforces two-step verification.
  const asCaller = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await asCaller.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
  if (!userData?.user) return null;
  const { data: isAdmin } = await asCaller.rpc("is_admin");
  return isAdmin ? userData.user : null;
}

/** Constant-time comparison of two strings (via their SHA-256 digests). */
async function sameSecret(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const ax = new Uint8Array(x);
  const ay = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ax.length; i++) diff |= ax[i] ^ ay[i];
  return diff === 0;
}

async function findUserByEmail(email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email || "").toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function bootstrap(body: Record<string, unknown>) {
  const setupCode = Deno.env.get("SETUP_CODE") || "";
  if (setupCode.length < 8) return fail(400, "First-time setup isn’t switched on. Add the SETUP_CODE secret in Supabase (Edge Functions → Secrets).");
  if ((await adminIds()).size > 0) return fail(409, "This website already has an admin. Please sign in instead.");
  if (!(await sameSecret(String(body.code || "").trim(), setupCode))) {
    await new Promise((r) => setTimeout(r, 1500)); // slow down guessing
    return fail(403, "That setup code isn’t right.");
  }
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim().slice(0, 120);
  const password = String(body.password || "");
  if (!EMAIL.test(email)) return fail(400, "Please enter a valid email address.");
  if (password.length < 10) return fail(400, "Use a password of at least 10 characters.");

  const meta = { user_metadata: { name, must_change_password: false }, app_metadata: { role: "admin" } };
  let userId: string;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, ...meta });
  if (error) {
    if (!/already been registered|already exists/i.test(error.message)) throw error;
    // An account with this email exists (e.g. from an earlier sign-up): take it over.
    const existing = await findUserByEmail(email);
    if (!existing) throw error;
    const { error: updateError } = await service.auth.admin.updateUserById(existing.id, { password, email_confirm: true, ...meta });
    if (updateError) throw updateError;
    userId = existing.id;
  } else {
    userId = data.user.id;
  }
  const { error: adminError } = await service.from("admins").upsert({ user_id: userId, email }, { onConflict: "user_id" });
  if (adminError) throw adminError;
  await audit({ id: userId, email }, "create", email, { role: "admin", firstAdmin: true });
  return reply(200, { ok: true, email });
}

async function adminIds() {
  const { data, error } = await service.from("admins").select("user_id");
  if (error) throw error;
  return new Set((data || []).map((r) => r.user_id as string));
}

async function audit(actor: { id: string; email?: string }, action: string, target: string, details: Record<string, unknown> = {}) {
  await service.from("audit_log").insert({
    actor_id: actor.id,
    actor_email: actor.email ?? null,
    table_name: "people",
    record_key: target,
    action,
    changed_keys: Object.keys(details),
    new_data: details,
  });
}

async function listPeople() {
  const admins = await adminIds();
  const people = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) {
      const role = admins.has(u.id) ? "admin" : u.app_metadata?.role === "member" ? "member" : "unapproved";
      people.push({
        id: u.id,
        email: u.email,
        name: (u.user_metadata?.name as string) || "",
        role,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
        mustChangePassword: u.user_metadata?.must_change_password === true,
      });
    }
    if (data.users.length < 200) break;
  }
  const order = { admin: 0, member: 1, unapproved: 2 } as Record<string, number>;
  return people.sort((a, b) => order[a.role] - order[b.role] || (a.name || a.email || "").localeCompare(b.name || b.email || ""));
}

async function setRole(userId: string, email: string, role: string) {
  const { data: existing } = await service.auth.admin.getUserById(userId);
  const appMeta = { ...(existing?.user?.app_metadata || {}), role };
  const { error } = await service.auth.admin.updateUserById(userId, { app_metadata: appMeta });
  if (error) throw error;
  if (role === "admin") {
    const { error: insertError } = await service.from("admins").upsert({ user_id: userId, email: email.toLowerCase() }, { onConflict: "user_id" });
    if (insertError) throw insertError;
  } else {
    const { error: deleteError } = await service.from("admins").delete().eq("user_id", userId);
    if (deleteError) throw deleteError;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail(405, "Method not allowed.");

  const body = await req.json().catch(() => ({}));

  // Public: is first-time setup still needed? (Reveals nothing else.)
  if (body.action === "setupStatus") {
    try {
      return reply(200, { needsSetup: (await adminIds()).size === 0 });
    } catch {
      return fail(500, "Couldn’t check setup status.");
    }
  }
  if (body.action === "bootstrap") {
    try {
      return await bootstrap(body);
    } catch (err) {
      console.error("bootstrap error", err instanceof Error ? err.message : err);
      return fail(500, "Something went wrong. Please try again.");
    }
  }

  const caller = await callerFrom(req);
  if (!caller) return fail(403, "Only admins can manage people. Please sign in again.");

  try {
    switch (body.action) {
      case "list":
        return reply(200, { people: await listPeople() });

      case "create": {
        const email = String(body.email || "").trim().toLowerCase();
        const name = String(body.name || "").trim().slice(0, 120);
        const role = String(body.role || "member");
        if (!EMAIL.test(email)) return fail(400, "Please enter a valid email address.");
        if (!ROLES.has(role)) return fail(400, "Choose Member or Admin.");
        const password = tempPassword();
        const { data, error } = await service.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, must_change_password: true },
          app_metadata: { role },
        });
        if (error) {
          if (/already been registered|already exists/i.test(error.message)) {
            return fail(409, "That email already has an account. Find it in the list below to change its role or reset its password.");
          }
          throw error;
        }
        await setRole(data.user.id, email, role);
        await audit(caller, "create", email, { role });
        return reply(200, { ok: true, id: data.user.id, email, tempPassword: password });
      }

      case "setRole": {
        const userId = String(body.userId || "");
        const role = String(body.role || "");
        if (!ROLES.has(role)) return fail(400, "Choose Member or Admin.");
        const admins = await adminIds();
        if (role === "member" && admins.has(userId)) {
          if (userId === caller.id) return fail(400, "You can’t remove your own admin access. Ask another admin to do it.");
          if (admins.size <= 1) return fail(400, "There must always be at least one admin.");
        }
        const { data: target, error } = await service.auth.admin.getUserById(userId);
        if (error || !target?.user) return fail(404, "That person no longer exists.");
        await setRole(userId, target.user.email || "", role);
        await audit(caller, "set role", target.user.email || userId, { role });
        return reply(200, { ok: true });
      }

      case "resetPassword": {
        const userId = String(body.userId || "");
        const { data: target, error } = await service.auth.admin.getUserById(userId);
        if (error || !target?.user) return fail(404, "That person no longer exists.");
        const password = tempPassword();
        const { error: updateError } = await service.auth.admin.updateUserById(userId, {
          password,
          user_metadata: { ...(target.user.user_metadata || {}), must_change_password: true },
        });
        if (updateError) throw updateError;
        await audit(caller, "reset password", target.user.email || userId);
        return reply(200, { ok: true, tempPassword: password });
      }

      case "remove": {
        const userId = String(body.userId || "");
        if (userId === caller.id) return fail(400, "You can’t remove your own account.");
        const admins = await adminIds();
        if (admins.has(userId) && admins.size <= 1) return fail(400, "There must always be at least one admin.");
        const { data: target } = await service.auth.admin.getUserById(userId);
        const { error } = await service.auth.admin.deleteUser(userId);
        if (error) throw error;
        await audit(caller, "remove", target?.user?.email || userId);
        return reply(200, { ok: true });
      }

      default:
        return fail(400, "Unknown action.");
    }
  } catch (err) {
    console.error("team error", err instanceof Error ? err.message : err);
    return fail(500, "Something went wrong. Please try again.");
  }
});
