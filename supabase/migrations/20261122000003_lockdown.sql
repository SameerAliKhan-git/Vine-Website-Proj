-- Trigger-only functions must not be callable through the REST API.
revoke all on function public.audit_change() from public, anon, authenticated;
revoke all on function public.alert_on_giving_change() from public, anon, authenticated;
-- public.is_admin() stays executable on purpose: RLS policies call it as the signed-in
-- user, and it only reveals whether *the caller* is an admin.
-- public.contact_attempts intentionally has no policies: only the service role touches it.
