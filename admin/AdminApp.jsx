import { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  BookOpenText,
  CalendarDays,
  ExternalLink,
  HandHeart,
  Images,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Radio,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { adminApi } from "../lib/api.js";
import { useSite } from "../lib/SiteContext.jsx";
import { ToastProvider } from "./toast.jsx";
import {
  AccountPanel,
  ActivitiesPanel,
  Dashboard,
  GalleryPanel,
  InboxPanel,
  LeadersPanel,
  LivePanel,
  MinistriesPanel,
  SermonsPanel,
  SettingsPanel,
} from "./panels.jsx";
import "./admin.css";

function Login({ onDone }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminApi.login(password);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login__card" onSubmit={submit}>
        <img src="/logo.png" alt="" width="52" height="52" />
        <h1>Church admin</h1>
        <p>Sign in to update the website.</p>
        <label className="a-field">
          <span>Password</span>
          <input className="a-input" type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="a-error">{error}</p>}
        <button className="a-btn a-btn--primary a-btn--block" type="submit" disabled={busy}>
          <LockKeyhole size={16} aria-hidden="true" /> {busy ? "Signing in…" : "Sign in"}
        </button>
        <a className="admin-login__back" href="/">
          ← Back to website
        </a>
      </form>
    </div>
  );
}

const nav = [
  { to: "", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "live", label: "Live & sessions", Icon: Radio },
  { to: "activities", label: "Activities", Icon: CalendarDays },
  { to: "sermons", label: "Previous messages", Icon: BookOpenText },
  { to: "gallery", label: "Photo gallery", Icon: Images },
  { to: "ministries", label: "Ministries", Icon: HandHeart },
  { to: "leaders", label: "Leadership", Icon: Users },
  { to: "inbox", label: "Inbox", Icon: Inbox },
  { to: "settings", label: "Site settings", Icon: Settings },
  { to: "account", label: "Account", Icon: UserRound },
];

function AdminShell({ onSignOut }) {
  const [data, setDataRaw] = useState(null);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { refresh } = useSite();

  useEffect(() => {
    adminApi
      .get("/data")
      .then(setDataRaw)
      .catch((err) => (err.status === 401 ? onSignOut() : setError(err.message)));
  }, [onSignOut]);

  // Whenever admin data changes, refresh the public site data too.
  const setData = useCallback(
    (fn) => {
      setDataRaw(fn);
      refresh();
    },
    [refresh],
  );

  useEffect(() => {
    document.title = "Admin · Church website";
  }, []);

  if (error) return <p className="a-error admin-loading">{error}</p>;
  if (!data) return <p className="admin-loading">Loading…</p>;

  const unread = data.messages.filter((m) => !m.read).length;
  const props = { data, setData };

  return (
    <div className="admin">
      <aside className={`admin__side${menuOpen ? " is-open" : ""}`}>
        <div className="admin__brand">
          <img src={data.settings.logoUrl || "/logo.png"} alt="" />
          <span>
            <strong>{data.settings.name}</strong>
            <small>Admin panel</small>
          </span>
          <button type="button" className="icon-btn admin__close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav>
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink key={label} to={`/admin/${to}`} end={end} onClick={() => setMenuOpen(false)}>
              <Icon size={17} aria-hidden="true" />
              {label}
              {to === "inbox" && unread > 0 && <span className="badge">{unread}</span>}
              {to === "live" && data.live.isLive && <span className="badge badge--live">LIVE</span>}
            </NavLink>
          ))}
        </nav>
        <div className="admin__side-foot">
          <a href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" /> View website
          </a>
          <button
            type="button"
            onClick={async () => {
              await adminApi.logout().catch(() => {});
              onSignOut();
            }}
          >
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>
      <div className="admin__main">
        <div className="admin__topbar">
          <button type="button" className="icon-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <strong>{data.settings.name} admin</strong>
        </div>
        <div className="admin__content">
          <Routes>
            <Route index element={<Dashboard {...props} />} />
            <Route path="live" element={<LivePanel {...props} />} />
            <Route path="activities" element={<ActivitiesPanel {...props} />} />
            <Route path="sermons" element={<SermonsPanel {...props} />} />
            <Route path="gallery" element={<GalleryPanel {...props} />} />
            <Route path="ministries" element={<MinistriesPanel {...props} />} />
            <Route path="leaders" element={<LeadersPanel {...props} />} />
            <Route path="inbox" element={<InboxPanel {...props} />} />
            <Route path="settings" element={<SettingsPanel {...props} />} />
            <Route path="account" element={<AccountPanel />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(null);
  useEffect(() => {
    adminApi
      .me()
      .then((r) => setAuthed(r.authenticated))
      .catch(() => setAuthed(false));
  }, []);
  const signOut = useCallback(() => setAuthed(false), []);

  return (
    <ToastProvider>
      {authed === null ? (
        <p className="admin-loading">Loading…</p>
      ) : authed ? (
        <AdminShell onSignOut={signOut} />
      ) : (
        <Login onDone={() => setAuthed(true)} />
      )}
    </ToastProvider>
  );
}
