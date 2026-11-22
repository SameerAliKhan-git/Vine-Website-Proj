import { useCallback, useEffect, useState } from "react";
import { usePageTitle } from "../lib/usePageTitle.js";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  BookOpenText,
  CalendarDays,
  ExternalLink,
  HandHeart,
  Images,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Radio,
  Settings,
  ShieldCheck,
  Type,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { adminApi, auth } from "../lib/api.js";
import { useSite } from "../lib/SiteContext.jsx";
import { authRedirect, supabase } from "../lib/supabase.js";
import { ToastProvider } from "./toast.jsx";
import MemberHome from "./MemberHome.jsx";
import PeoplePanel from "./PeoplePanel.jsx";
import {
  AccountPanel,
  ActivitiesPanel,
  PageTextPanel,
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

export const MIN_PASSWORD = 10;

function AuthCard({ title, children, onSubmit, icon = <img src="/logo.png" alt="" width="52" height="52" /> }) {
  return (
    <div className="admin-login">
      <form className="admin-login__card" onSubmit={onSubmit}>
        {icon}
        <h1>{title}</h1>
        {children}
        <a className="admin-login__back" href="/">
          ← Back to website
        </a>
      </form>
    </div>
  );
}

function Login({ onDone }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(authRedirect.error || "");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.signIn(email, password);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email.trim()) {
      setError("Type your email address first, then press “Forgot password?”.");
      return;
    }
    setError("");
    try {
      await auth.sendPasswordReset(email);
      setNotice("If that email has an account, a reset link is on its way. Check your inbox (and spam folder).");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AuthCard title="Sign in" onSubmit={submit}>
      <p>For church members and admins. Your account is set up by a church admin. Ask them if you don’t have one yet.</p>
      <label className="a-field">
        <span>Email</span>
        <input className="a-input" type="email" autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="a-field">
        <span>Password</span>
        <input className="a-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <p className="a-error">{error}</p>}
      {notice && <p className="a-notice">{notice}</p>}
      <button className="a-btn a-btn--primary a-btn--block" type="submit" disabled={busy}>
        <LockKeyhole size={16} aria-hidden="true" /> {busy ? "Signing in…" : "Sign in"}
      </button>
      <button type="button" className="a-link" onClick={forgot}>
        Forgot password?
      </button>
    </AuthCard>
  );
}

function MfaPrompt({ onDone, onCancel }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.mfa.verify(code);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Two-step verification" onSubmit={submit} icon={<ShieldCheck size={44} className="admin-login__icon" aria-hidden="true" />}>
      <p>Enter the 6-digit code from your authenticator app.</p>
      <label className="a-field">
        <span>Code</span>
        <input
          className="a-input a-input--code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      </label>
      {error && <p className="a-error">{error}</p>}
      <button className="a-btn a-btn--primary a-btn--block" type="submit" disabled={busy}>
        {busy ? "Checking…" : "Verify"}
      </button>
      <button type="button" className="a-link" onClick={onCancel}>
        Use a different account
      </button>
    </AuthCard>
  );
}

function SetPassword({ invited, temporary, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError("The passwords don’t match.");
    setBusy(true);
    setError("");
    try {
      await auth.setPassword(password);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title={invited || temporary ? "Welcome! Choose your password" : "Choose a new password"}
      onSubmit={submit}
      icon={<KeyRound size={44} className="admin-login__icon" aria-hidden="true" />}
    >
      {temporary && <p>You signed in with a temporary password. Please choose your own so only you know it.</p>}
      <p>Use at least {MIN_PASSWORD} characters. A short sentence you’ll remember works well.</p>
      <label className="a-field">
        <span>New password</span>
        <input className="a-input" type="password" autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <label className="a-field">
        <span>Confirm password</span>
        <input className="a-input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </label>
      {error && <p className="a-error">{error}</p>}
      <button className="a-btn a-btn--primary a-btn--block" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save password"}
      </button>
    </AuthCard>
  );
}

function NotAdmin({ email, onSignOut }) {
  return (
    <AuthCard
      title="Account not approved yet"
      onSubmit={(e) => {
        e.preventDefault();
        onSignOut();
      }}
    >
      <p>
        <strong>{email}</strong> is signed in, but a church admin hasn’t approved this account yet. Ask an admin to approve it under People.
      </p>
      <button className="a-btn a-btn--primary a-btn--block" type="submit">
        Sign out
      </button>
    </AuthCard>
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
  { to: "pages", label: "Page headings", Icon: Type },
  { to: "settings", label: "Site settings", Icon: Settings },
  { to: "people", label: "People & access", Icon: UserCog },
  { to: "account", label: "Account & security", Icon: UserRound },
];

function AdminShell({ email, onSignOut }) {
  const [data, setDataRaw] = useState(null);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { refresh } = useSite();

  const load = useCallback(() => {
    adminApi
      .data()
      .then(setDataRaw)
      .catch((err) => (err.status === 401 ? onSignOut() : setError(err.message)));
  }, [onSignOut]);

  useEffect(load, [load]);

  // Whenever admin data changes, refresh the public site data too.
  const setData = useCallback(
    (fn) => {
      setDataRaw(fn);
      refresh();
    },
    [refresh],
  );

  if (error) {
    return (
      <div className="admin-loading">
        <p className="a-error">{error}</p>
        <button type="button" className="a-btn a-btn--ghost" onClick={() => (setError(""), load())}>
          Try again
        </button>
      </div>
    );
  }
  if (!data) return <p className="admin-loading">Loading…</p>;

  const unread = data.messages.filter((m) => !m.read).length;
  const props = { data, setData, reload: load };

  return (
    <div className="admin">
      <aside className={`admin__side${menuOpen ? " is-open" : ""}`}>
        <div className="admin__brand">
          <img src={data.settings.logoUrl || "/logo.png"} alt="" />
          <span>
            <strong>{data.settings.name}</strong>
            <small>{email}</small>
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
          <button type="button" onClick={onSignOut}>
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
            <Route path="pages" element={<PageTextPanel {...props} />} />
            <Route path="people" element={<PeoplePanel />} />
            <Route path="account" element={<AccountPanel email={email} />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/**
 * `portal` is the /account sign-in page for everyone: members get their member page there,
 * admins are sent on to /admin. /admin itself is only for admins.
 */
export default function AdminApp({ portal = false }) {
  usePageTitle(portal ? "Sign in" : "Church admin");
  const [status, setStatus] = useState({ state: "loading" });
  const [settingPassword, setSettingPassword] = useState(
    authRedirect.type === "invite" || authRedirect.type === "recovery" ? authRedirect.type : null,
  );

  const check = useCallback(() => {
    auth
      .status()
      .then(setStatus)
      .catch((err) => setStatus({ state: "error", message: err.message }));
  }, []);

  useEffect(() => {
    check();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSettingPassword("recovery");
      if (event === "SIGNED_OUT") setStatus({ state: "signedOut" });
    });
    return () => data.subscription.unsubscribe();
  }, [check]);

  const signOut = useCallback(async () => {
    await auth.signOut().catch(() => {});
    setStatus({ state: "signedOut" });
  }, []);

  let screen;
  if (status.state === "loading") screen = <p className="admin-loading">Loading…</p>;
  else if (settingPassword && status.state !== "signedOut")
    screen = (
      <SetPassword
        invited={settingPassword === "invite"}
        onDone={() => {
          setSettingPassword(null);
          window.history.replaceState(null, "", portal ? "/account" : "/admin");
          check();
        }}
      />
    );
  else if (status.state === "signedOut") screen = <Login onDone={check} />;
  else if (status.state === "needsMfa") screen = <MfaPrompt onDone={check} onCancel={signOut} />;
  else if (status.mustChangePassword && status.state !== "error") screen = <SetPassword temporary onDone={check} />;
  else if (status.state === "notAdmin") screen = <NotAdmin email={status.email} onSignOut={signOut} />;
  else if (status.state === "member") screen = portal ? <MemberHome status={status} onSignOut={signOut} /> : <Navigate to="/account" replace />;
  else if (status.state === "ok" && portal) screen = <Navigate to="/admin" replace />;
  else if (status.state === "error")
    screen = (
      <div className="admin-loading">
        <p className="a-error">{status.message}</p>
        <button type="button" className="a-btn a-btn--ghost" onClick={check}>
          Try again
        </button>
      </div>
    );
  else screen = <AdminShell email={status.email} onSignOut={signOut} />;

  return <ToastProvider>{screen}</ToastProvider>;
}
