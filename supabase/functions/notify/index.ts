// Emails the church when UPI / bank details on the website change.
// Called by a database trigger with only an audit-log id. The function re-reads that
// row with the service role and sends at most one email per change, so a stranger
// calling this URL can't send anything that isn't a real, fresh change.
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const GIVING_KEYS: Record<string, string> = {
  upiId: "UPI ID",
  upiQrImage: "UPI QR code image",
  bankAccountName: "Account name",
  bankAccountNumber: "Account number",
  bankIfsc: "IFSC",
  bankName: "Bank",
  bankBranch: "Branch",
};

const ok = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok({ skipped: "method" });
  const { auditId } = await req.json().catch(() => ({}));
  if (!Number.isInteger(auditId)) return ok({ skipped: "no id" });

  // Claim the row atomically so the email is sent once.
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: rows, error } = await supabase
    .from("audit_log")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", auditId)
    .eq("table_name", "site_config")
    .eq("record_key", "settings")
    .is("notified_at", null)
    .gte("at", fiveMinutesAgo)
    .select("at, actor_email, changed_keys, old_data, new_data");
  if (error) {
    console.error(error);
    return ok({ error: "lookup failed" });
  }
  const row = rows?.[0];
  if (!row) return ok({ skipped: "not found or already sent" });

  const changed = (row.changed_keys as string[]).filter((k) => k in GIVING_KEYS);
  if (!changed.length) return ok({ skipped: "not giving" });

  const key = Deno.env.get("RESEND_API_KEY");
  const to = (Deno.env.get("NOTIFY_EMAIL") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!key || !to.length) {
    console.warn("Giving details changed but RESEND_API_KEY / NOTIFY_EMAIL are not set.");
    return ok({ skipped: "email not configured" });
  }

  const lines = changed.map((k) => {
    const before = row.old_data?.[k] || "(empty)";
    const after = row.new_data?.[k] || "(empty)";
    return `• ${GIVING_KEYS[k]}: ${before}  →  ${after}`;
  });
  const when = new Date(row.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("NOTIFY_FROM") || "Church website <onboarding@resend.dev>",
      to,
      subject: "⚠ Giving details on the church website were changed",
      text:
        `The giving (UPI / bank) details on the church website were changed on ${when} IST by ${row.actor_email || "an admin"}.\n\n` +
        `${lines.join("\n")}\n\n` +
        `If you did not expect this change, sign in to ${Deno.env.get("SITE_URL") || "the website"}/admin immediately, ` +
        `restore the correct details and change the admin password.`,
    }),
  });
  if (!response.ok) console.error("email failed", response.status, await response.text());
  return ok({ sent: response.ok });
});
