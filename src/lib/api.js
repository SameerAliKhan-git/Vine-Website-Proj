import { mergeSermons } from "./format.js";
import { prepareImage } from "./image.js";
import { publicClient, scratchClient, supabase } from "./supabase.js";

const NOT_ALLOWED = "You don’t have permission to do that. Please sign in again.";

/** Turn Supabase / network errors into messages a church volunteer can act on. */
function toError(error) {
  const raw = error?.message || String(error || "");
  let message = raw || "Something went wrong. Please try again.";
  let status;
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) message = "Can’t reach the server. Check your internet connection and try again.";
  if (error?.code === "42501" || error?.code === "PGRST116" || /JWT|row-level security/i.test(raw)) {
    status = 401;
    if (error?.code !== "42501") message = NOT_ALLOWED;
  }
  if (/Invalid login credentials/i.test(raw)) message = "That email or password isn’t right.";
  if (/Email not confirmed/i.test(raw)) message = "Please confirm your email address first (check your inbox).";
  const result = new Error(message);
  result.status = status;
  result.code = error?.code;
  return result;
}

async function rpc(name, args, client = supabase) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw toError(error);
  return data;
}

async function invoke(name, body, client = supabase) {
  const { data, error } = await client.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try {
      const payload = await error.context.json();
      if (payload?.error) message = payload.error;
    } catch {
      /* not JSON */
    }
    throw toError({ message });
  }
  return data;
}

/* ---------------------------------------------------------------- public */

export const api = {
  site: () => rpc("get_site", undefined, publicClient),
  sermons: async () => mergeSermons(await rpc("get_sermons", undefined, publicClient)),
  contact: (payload) => invoke("contact", payload, publicClient),
};

/* ----------------------------------------------------------------- admin */

const asItem = (row) => ({ ...row.data, id: row.id });
const withoutId = (value) => {
  const copy = { ...value };
  delete copy.id;
  return copy;
};

export const adminApi = {
  data: () => rpc("admin_data"),

  async create(collection, value) {
    const { data, error } = await supabase
      .from("content_items")
      .insert({ collection, data: withoutId(value) })
      .select("id, data")
      .single();
    if (error) throw toError(error);
    return asItem(data);
  },

  async update(collection, id, value) {
    const { data, error } = await supabase
      .from("content_items")
      .update({ data: withoutId(value) })
      .eq("id", id)
      .eq("collection", collection)
      .select("id, data")
      .single();
    if (error) throw toError(error);
    return asItem(data);
  },

  async remove(collection, id) {
    const { error, count } = await supabase
      .from("content_items")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("collection", collection);
    if (error) throw toError(error);
    if (count === 0) throw toError({ code: "PGRST116" });
  },

  reorder: (collection, ids) => rpc("reorder_items", { p_collection: collection, p_ids: ids }),

  /** key: "settings" | "live" */
  async saveConfig(key, value) {
    const { data, error } = await supabase.from("site_config").update({ data: value }).eq("key", key).select("data").single();
    if (error) throw toError(error);
    return data.data;
  },

  async markRead(id, read) {
    const { error } = await supabase.from("messages").update({ read }).eq("id", id);
    if (error) throw toError(error);
  },

  async deleteMessage(id) {
    const { error, count } = await supabase.from("messages").delete({ count: "exact" }).eq("id", id);
    if (error) throw toError(error);
    if (count === 0) throw toError({ code: "PGRST116" });
  },

  async upload(file, { raw = false } = {}) {
    const prepared = raw ? file : await prepareImage(file);
    const ext = { "image/webp": "webp", "image/png": "png", "image/gif": "gif" }[prepared.type] || "jpg";
    const now = new Date();
    const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, prepared, {
      contentType: prepared.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      if (/mime|type/i.test(error.message)) throw new Error("Please choose a JPG, PNG, WebP or GIF image.");
      if (/size|large/i.test(error.message)) throw new Error("That image is too large (10 MB maximum).");
      throw toError(error);
    }
    return { url: supabase.storage.from("media").getPublicUrl(path).data.publicUrl };
  },

  /** Ask the server to pull the latest videos from YouTube right now. */
  syncYouTube: () => invoke("youtube-sync", { force: true }),
};

/* ------------------------------------------------------------------ auth */

/* ---------------------------------------------------------------- people */

export const teamApi = {
  list: async () => (await invoke("team", { action: "list" })).people,
  create: (person) => invoke("team", { action: "create", ...person }),
  setRole: (userId, role) => invoke("team", { action: "setRole", userId, role }),
  resetPassword: (userId) => invoke("team", { action: "resetPassword", userId }),
  remove: (userId) => invoke("team", { action: "remove", userId }),
};

export const auth = {
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw toError(error);
  },

  signOut: () => supabase.auth.signOut(),

  async sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/account`,
    });
    if (error) throw toError(error);
  },

  /**
   * { state: "signedOut" | "notAdmin" | "member" | "needsMfa" | "ok", email, name, mustChangePassword }
   * "ok" means a fully signed-in admin; "member" a church member; "notAdmin" an account
   * that no admin has approved.
   */
  async status() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { state: "signedOut" };
    const { user } = session;
    const base = {
      email: user.email,
      name: user.user_metadata?.name || "",
      mustChangePassword: user.user_metadata?.must_change_password === true,
    };
    const { data: row, error } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (error) throw toError(error);
    if (!row) return { state: user.app_metadata?.role === "member" ? "member" : "notAdmin", ...base };
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") return { state: "needsMfa", ...base };
    return { state: "ok", ...base };
  },

  /** Sets a new password and clears the "choose your own password" flag from a temporary one. */
  async setPassword(password) {
    const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
    if (error) throw toError(error);
  },

  async changePassword(currentPassword, newPassword) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw toError({ code: "42501", message: "Please sign in again." });
    // Check the current password on a separate client so the admin's MFA session isn't downgraded.
    const verifier = scratchClient();
    const { error: wrong } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (wrong) throw new Error("Your current password isn’t right.");
    await verifier.auth.signOut({ scope: "local" });
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw toError(error);
    await supabase.auth.signOut({ scope: "others" });
  },

  mfa: {
    async factors() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw toError(error);
      return data.all || [];
    },
    async enroll() {
      // Clear abandoned set-ups first so the authenticator app doesn't end up with duplicates.
      const existing = await auth.mfa.factors();
      for (const factor of existing.filter((f) => f.status !== "verified")) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
      if (error) throw toError(error);
      return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
    },
    async verify(code, factorId) {
      let id = factorId;
      if (!id) {
        const factors = await auth.mfa.factors();
        id = factors.find((f) => f.factor_type === "totp" && f.status === "verified")?.id;
      }
      if (!id) throw new Error("No authenticator is set up for this account.");
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code: code.replace(/\s/g, "") });
      if (error) throw new Error("That code didn’t work. Check the time on your phone and try the newest code.");
    },
    async remove(factorId) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw toError(error);
    },
  },
};
