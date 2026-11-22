import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const configError =
  !SUPABASE_URL || !SUPABASE_KEY ? "The website isn’t configured yet (missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)." : null;

// Supabase puts invite / password-reset results in the URL hash. Read it before the
// client consumes it so the admin app knows to ask for a new password.
const hash = new URLSearchParams(window.location.hash.slice(1));
export const authRedirect = {
  type: hash.get("type"), // "invite" | "recovery" | "signup" | "magiclink" | null
  error: hash.get("error_description"),
};

export const supabase = createClient(SUPABASE_URL || "http://localhost", SUPABASE_KEY || "missing-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "vine-admin-auth",
  },
});

/**
 * Anonymous client for the public website (site content, sermons, contact form). It never
 * sends a member's sign-in token, so public pages keep working even if a session expires.
 */
export const publicClient = createClient(SUPABASE_URL || "http://localhost", SUPABASE_KEY || "missing-key", {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "vine-public" },
});

/** A throwaway client used only to check a password without touching the main session. */
export function scratchClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "vine-verify" },
  });
}
