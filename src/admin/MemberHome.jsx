import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, HandHeart, HeartHandshake, Images, KeyRound, LogOut, MessageCircleHeart, Phone, PlayCircle, Radio } from "lucide-react";
import { auth } from "../lib/api.js";
import { formatDate, formatTime, phoneList, safeUrl, telHref, upcomingSessions } from "../lib/format.js";
import { useSite } from "../lib/SiteContext.jsx";
import { useToast } from "./toast.jsx";

const MIN_PASSWORD = 10;

function ChangePassword() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  async function save(event) {
    event.preventDefault();
    if (form.next.length < MIN_PASSWORD) return toast(`Use at least ${MIN_PASSWORD} characters.`, "error");
    if (form.next !== form.confirm) return toast("The new passwords don’t match.", "error");
    setSaving(true);
    try {
      await auth.changePassword(form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      toast("Password changed.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="a-card member__card" onSubmit={save}>
      <h2>
        <KeyRound size={18} aria-hidden="true" /> Change password
      </h2>
      <label className="a-field">
        <span>Current password</span>
        <input className="a-input" type="password" autoComplete="current-password" value={form.current} onChange={set("current")} required />
      </label>
      <label className="a-field">
        <span>New password ({MIN_PASSWORD}+ characters)</span>
        <input className="a-input" type="password" autoComplete="new-password" value={form.next} onChange={set("next")} required />
      </label>
      <label className="a-field">
        <span>Confirm new password</span>
        <input className="a-input" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required />
      </label>
      <button className="a-btn a-btn--primary" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

/** What a church member sees after signing in. */
export default function MemberHome({ status, onSignOut }) {
  const site = useSite().site;
  const settings = site?.settings || {};
  const sessions = upcomingSessions(site?.sessions || []).slice(0, 3);
  const firstName = (status.name || "").split(" ")[0];
  const prayerLines = phoneList(settings.prayerPhones);
  const live = site?.live?.isLive;

  return (
    <div className="member">
      <header className="member__top">
        <Link to="/" className="member__brand">
          <img src={safeUrl(settings.logoUrl) || "/logo.png"} alt="" width="44" height="44" />
          <span>{settings.name || "Vine India"}</span>
        </Link>
        <button type="button" className="a-btn a-btn--ghost" onClick={onSignOut}>
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      </header>

      <main className="member__main">
        <section className="member__welcome">
          <p className="member__eyebrow">Member area</p>
          <h1>Welcome{firstName ? `, ${firstName}` : ""}!</h1>
          <p>Good to see you. Here’s what’s happening in our church family this week.</p>
        </section>

        {live && (
          <Link to="/services" className="member__live">
            <Radio size={18} aria-hidden="true" /> We’re live right now: <strong>{site.live.title || "Watch the service"}</strong>
          </Link>
        )}

        <div className="member__grid">
          <section className="a-card member__card">
            <h2>
              <CalendarDays size={18} aria-hidden="true" /> This week
            </h2>
            {sessions.length ? (
              <ul className="member__list">
                {sessions.map((s) => (
                  <li key={s.id + s.startsAt}>
                    <strong>{s.title}</strong>
                    <span>
                      {formatDate(s.startsAt, { weekday: true })} · {formatTime(s.startsAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="a-help">Service times are on the Services page.</p>
            )}
            <Link className="a-link" to="/services">
              All services &amp; times →
            </Link>
          </section>

          <section className="a-card member__card">
            <h2>
              <MessageCircleHeart size={18} aria-hidden="true" /> Prayer
            </h2>
            <p className="a-help">Need prayer? Send a request and our team will pray with you.</p>
            <Link className="a-btn a-btn--primary" to="/visit#contact-form">
              Send a prayer request
            </Link>
            {prayerLines.length > 0 && (
              <ul className="member__phones">
                {prayerLines.map((n) => (
                  <li key={n}>
                    <a href={telHref(n)}>
                      <Phone size={14} aria-hidden="true" /> {n}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <nav className="member__links" aria-label="Quick links">
            <Link to="/services">
              <PlayCircle size={20} aria-hidden="true" /> Watch services &amp; messages
            </Link>
            <Link to="/activities">
              <HeartHandshake size={20} aria-hidden="true" /> Events &amp; meetings
            </Link>
            <Link to="/gallery">
              <Images size={20} aria-hidden="true" /> Church photos
            </Link>
            <Link to="/give">
              <HandHeart size={20} aria-hidden="true" /> Give
            </Link>
          </nav>

          <ChangePassword />
        </div>
        <p className="member__signed-in">
          Signed in as <strong>{status.email}</strong>
        </p>
      </main>
    </div>
  );
}
