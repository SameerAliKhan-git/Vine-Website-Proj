import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, ShieldCheck, ShieldOff, Trash2, UserPlus, Users } from "lucide-react";
import { teamApi } from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import { useSite } from "../lib/SiteContext.jsx";
import { useToast } from "./toast.jsx";

const ROLE_LABEL = { admin: "Admin", member: "Member", unapproved: "Not approved" };

/** Shows a new temporary password once, with a ready-to-send message. */
function PasswordNotice({ notice, onClose }) {
  const toast = useToast();
  const site = useSite().site;
  const signInUrl = `${window.location.origin}/account`;
  const message = `Hello${notice.name ? ` ${notice.name}` : ""}! Your ${site?.settings?.name || "church"} website account is ready.\nSign in: ${signInUrl}\nEmail: ${notice.email}\nTemporary password: ${notice.password}\nYou’ll be asked to choose your own password when you first sign in.`;

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied.`);
    } catch {
      toast("Couldn’t copy. Please select the text and copy it.", "error");
    }
  }

  return (
    <section className="a-card people-notice" role="status">
      <h3>
        <KeyRound size={18} aria-hidden="true" /> {notice.title}
      </h3>
      <p className="a-help">
        Give this temporary password to <strong>{notice.email}</strong> privately (in person, by phone or a direct message). It is only shown
        now. They’ll choose their own password when they first sign in.
      </p>
      <div className="people-notice__password">
        <code>{notice.password}</code>
        <button type="button" className="a-btn a-btn--ghost" onClick={() => copy(notice.password, "Password")}>
          <Copy size={15} aria-hidden="true" /> Copy password
        </button>
      </div>
      <textarea className="a-input people-notice__message" readOnly rows={5} value={message} aria-label="Message to send" />
      <div className="editor__actions">
        <button type="button" className="a-btn a-btn--primary" onClick={() => copy(message, "Message")}>
          <Copy size={15} aria-hidden="true" /> Copy message
        </button>
        <button type="button" className="a-btn a-btn--ghost" onClick={onClose}>
          Done
        </button>
      </div>
    </section>
  );
}

export default function PeoplePanel() {
  const [people, setPeople] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", role: "member" });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    teamApi
      .list()
      .then((list) => {
        setPeople(list);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  async function run(key, task, success) {
    setBusy(key);
    try {
      const result = await task();
      if (success) toast(success);
      load();
      return result;
    } catch (err) {
      toast(err.message, "error");
      return null;
    } finally {
      setBusy("");
    }
  }

  async function add(event) {
    event.preventDefault();
    const result = await run("add", () => teamApi.create(form));
    if (result?.tempPassword) {
      setNotice({ title: "Account created", email: result.email, name: form.name.trim(), password: result.tempPassword });
      setForm({ name: "", email: "", role: "member" });
    }
  }

  async function resetPassword(person) {
    if (!window.confirm(`Give ${person.email} a new temporary password? Their current password will stop working.`)) return;
    const result = await run(`reset-${person.id}`, () => teamApi.resetPassword(person.id));
    if (result?.tempPassword) setNotice({ title: "New temporary password", email: person.email, name: person.name, password: result.tempPassword });
  }

  function remove(person) {
    if (!window.confirm(`Remove ${person.email}? They won’t be able to sign in any more. This can’t be undone.`)) return;
    run(`remove-${person.id}`, () => teamApi.remove(person.id), "Account removed.");
  }

  const counts = (people || []).reduce((acc, p) => ({ ...acc, [p.role]: (acc[p.role] || 0) + 1 }), {});

  return (
    <>
      <header className="panel-header">
        <h1>People &amp; access</h1>
        <p>
          Create sign-in accounts for church members and admins. <strong>Members</strong> get a member area on the website.{" "}
          <strong>Admins</strong> can edit everything: content, settings, people and messages.
        </p>
      </header>

      {notice && <PasswordNotice notice={notice} onClose={() => setNotice(null)} />}

      <form className="a-card" onSubmit={add}>
        <h3>
          <UserPlus size={18} aria-hidden="true" /> Add a person
        </h3>
        <div className="a-grid">
          <label className="a-field">
            <span>Name</span>
            <input className="a-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
          </label>
          <label className="a-field">
            <span>Email *</span>
            <input className="a-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="a-field">
            <span>Access</span>
            <select className="a-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="member">Member: member area only</option>
              <option value="admin">Admin: can edit the whole website</option>
            </select>
          </label>
        </div>
        <div className="editor__actions">
          <button type="submit" className="a-btn a-btn--primary" disabled={busy === "add"}>
            <UserPlus size={16} aria-hidden="true" /> {busy === "add" ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>

      <section className="a-section">
        <h2>
          <Users size={18} aria-hidden="true" /> Everyone with an account
          {people && (
            <small className="people-counts">
              {counts.admin || 0} admin{counts.admin === 1 ? "" : "s"} · {counts.member || 0} member{counts.member === 1 ? "" : "s"}
            </small>
          )}
        </h2>
        {error && <p className="a-error">{error}</p>}
        {!people && !error && <p className="a-help">Loading…</p>}
        {people?.length === 0 && <p className="a-help">No accounts yet.</p>}
        <ul className="people-list">
          {people?.map((person) => (
            <li key={person.id} className="people-row">
              <div className="people-row__who">
                <strong>{person.name || person.email}</strong>
                {person.name && <span>{person.email}</span>}
                <span className="people-row__meta">
                  {person.lastSignInAt ? `Last signed in ${formatDate(person.lastSignInAt)}` : "Hasn’t signed in yet"}
                  {person.mustChangePassword && " · using a temporary password"}
                </span>
              </div>
              <span className={`people-role people-role--${person.role}`}>{ROLE_LABEL[person.role]}</span>
              <div className="people-row__actions">
                {person.role === "admin" ? (
                  <button type="button" className="a-btn a-btn--ghost a-btn--small" disabled={!!busy} onClick={() => run(`role-${person.id}`, () => teamApi.setRole(person.id, "member"), "Changed to member.")}>
                    <ShieldOff size={15} aria-hidden="true" /> Make member
                  </button>
                ) : (
                  <>
                    {person.role === "unapproved" && (
                      <button type="button" className="a-btn a-btn--ghost a-btn--small" disabled={!!busy} onClick={() => run(`role-${person.id}`, () => teamApi.setRole(person.id, "member"), "Approved as a member.")}>
                        Approve as member
                      </button>
                    )}
                    <button
                      type="button"
                      className="a-btn a-btn--ghost a-btn--small"
                      disabled={!!busy}
                      onClick={() => window.confirm(`Make ${person.email} an admin? Admins can change everything on the website.`) && run(`role-${person.id}`, () => teamApi.setRole(person.id, "admin"), "Now an admin.")}
                    >
                      <ShieldCheck size={15} aria-hidden="true" /> Make admin
                    </button>
                  </>
                )}
                <button type="button" className="a-btn a-btn--ghost a-btn--small" disabled={!!busy} onClick={() => resetPassword(person)}>
                  <KeyRound size={15} aria-hidden="true" /> Reset password
                </button>
                <button type="button" className="a-btn a-btn--danger a-btn--small" disabled={!!busy} onClick={() => remove(person)}>
                  <Trash2 size={15} aria-hidden="true" /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
