import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Facebook, Instagram, LogIn, Mail, MapPin, Menu, Phone, Radio, UserRound, X, Youtube } from "lucide-react";
import BrandMark from "./BrandMark.jsx";
import { SmartLink } from "./ui.jsx";
import { useSite } from "../lib/SiteContext.jsx";
import { emailList, phoneList, safeUrl, telHref, youtubeChannelUrl } from "../lib/format.js";
import { useReveal } from "../lib/useReveal.js";
import { supabase } from "../lib/supabase.js";

export const navigation = [
  { label: "About", to: "/about" },
  { label: "Services", to: "/services" },
  { label: "Activities", to: "/activities" },
  { label: "Ministries", to: "/ministries" },
  { label: "Gallery", to: "/gallery" },
  { label: "Visit", to: "/visit" },
  { label: "Give", to: "/give" },
];

function TopBar() {
  const { site } = useSite();
  if (!site) return null;
  const { settings, live } = site;

  if (live.isLive) {
    return (
      <Link className="announcement announcement--live" to="/services">
        <span className="live-dot" aria-hidden="true" />
        <strong>LIVE NOW</strong>
        <span>{live.title || "Our service is streaming"}</span>
        <span className="announcement__cta">
          Watch <ArrowRight size={13} aria-hidden="true" />
        </span>
      </Link>
    );
  }
  if (!settings.announcementEnabled || !settings.announcementText) return null;
  return (
    <div className="announcement">
      {/* Word joiners keep ranges like "6:00–9:00 PM" on one line. */}
      <span>{settings.announcementText.replace(/\s*–\s*/g, "⁠–⁠")}</span>
      {settings.announcementLink && (
        <SmartLink to={settings.announcementLink}>
          {settings.announcementLinkText || "Learn more"} <ArrowRight size={13} aria-hidden="true" />
        </SmartLink>
      )}
    </div>
  );
}

/** Whether someone is signed in on this device (members and admins). */
function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth
      .getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)))
      .catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

function Header() {
  const signedIn = useSignedIn();
  const AccountIcon = signedIn ? UserRound : LogIn;
  const accountLabel = signedIn ? "My account" : "Sign in";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const { site } = useSite();
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <TopBar />
      <header className={`site-header${scrolled || menuOpen ? " site-header--scrolled" : ""}`}>
        <div className="header-inner">
          <BrandMark onClick={closeMenu} />
          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
                {item.to === "/services" && site?.live.isLive && <span className="nav-live">LIVE</span>}
              </NavLink>
            ))}
          </nav>
          <Link className="header-signin" to="/account" aria-label={signedIn ? "My account" : "Sign in for members and admins"}>
            <AccountIcon size={17} aria-hidden="true" /> {accountLabel}
          </Link>
          <Link className="button button--small header-visit" to={site?.live.isLive ? "/services" : "/visit"}>
            {site?.live.isLive ? "Watch live" : "Plan your visit"} <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <button
            className="menu-toggle"
            type="button"
            ref={menuButtonRef}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <div className="mobile-nav" id="mobile-navigation" hidden={!menuOpen}>
          <nav aria-label="Mobile navigation">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={closeMenu}>
                {item.label}
                <ArrowUpRight size={17} aria-hidden="true" />
              </NavLink>
            ))}
            <Link className="mobile-nav__signin" to="/account" onClick={closeMenu}>
              <AccountIcon size={17} aria-hidden="true" /> {signedIn ? "My account" : "Member & admin sign in"}
            </Link>
            <Link className="mobile-nav__visit" to="/visit" onClick={closeMenu}>
              Plan your visit <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}

function Footer() {
  const settings = useSite().site?.settings;
  if (!settings) return null;
  // Official church accounts only. Each icon lights up in its platform's own colours on hover.
  const socials = [
    { href: safeUrl(settings.instagramUrl), label: "Instagram", Icon: Instagram, brand: "instagram" },
    { href: safeUrl(settings.facebookUrl), label: "Facebook", Icon: Facebook, brand: "facebook" },
    { href: youtubeChannelUrl(settings), label: "YouTube", Icon: Youtube, brand: "youtube" },
  ].filter((s) => s.href);

  return (
    <footer className="footer" id="contact">
      <div className="footer__main">
        <div className="footer__brand">
          <BrandMark footer />
          <p>{settings.tagline}</p>
          {socials.length > 0 && (
            <div className="footer__socials">
              {socials.map(({ href, label, Icon, brand }) => (
                <a
                  key={label}
                  className={`social-link social-link--${brand}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${settings.name} on ${label} (opens in a new tab)`}
                  title={label}
                >
                  <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="footer__column">
          <span className="footer__heading">Find your way</span>
          {navigation.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="footer__column">
          <span className="footer__heading">Gather with us</span>
          {settings.serviceTimes.map((service, index) => (
            <span key={index} className="footer__service">
              <strong className="footer__strong">
                {service.day} · {service.time}
              </strong>
              <span>{[service.label, service.place].filter(Boolean).join(" · ")}</span>
            </span>
          ))}
          {settings.address && (
            <span className="footer__address">
              <MapPin size={14} aria-hidden="true" /> {settings.address}
            </span>
          )}
          <Link to="/visit">
            Get directions <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="footer__column">
          <span className="footer__heading">Say hello</span>
          {emailList(settings.email).map((email) => (
            <a key={email} href={`mailto:${email}`}>
              <Mail size={14} aria-hidden="true" /> {email}
            </a>
          ))}
          {settings.phone && (
            <a href={telHref(settings.phone)}>
              <Phone size={14} aria-hidden="true" /> {settings.phone}
            </a>
          )}
          {phoneList(settings.prayerPhones).length > 0 && (
            <span className="footer__prayer">
              <strong className="footer__strong">Prayer lines</strong>
              {phoneList(settings.prayerPhones).map((phone) => (
                <a key={phone} href={telHref(phone)}>
                  <Phone size={14} aria-hidden="true" /> {phone}
                </a>
              ))}
            </span>
          )}
          {!settings.email && !settings.phone && <span>We can’t wait to meet you.</span>}
          <Link to="/visit#contact-form">
            Send a prayer request <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          <Link to="/services">
            <Radio size={14} aria-hidden="true" /> Watch online
          </Link>
        </div>
      </div>
      <div className="footer__bottom">
        <span>
          © {new Date().getFullYear()} {settings.name}. All are welcome.
        </span>
        {settings.registrationNote && <span className="footer__registration">{settings.registrationNote}</span>}
        <Link to="/privacy">Privacy policy</Link>
        <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          Back to top <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 50);
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

/** Favicon, meta description and schema.org "Church" data from the admin settings (helps Google & Maps). */
function useSiteMetadata(settings) {
  useEffect(() => {
    if (!settings) return;
    const logo = safeUrl(settings.logoUrl);
    if (logo) {
      for (const link of document.querySelectorAll("link[rel='icon'], link[rel='apple-touch-icon']")) {
        link.removeAttribute("type");
        link.href = logo;
      }
    }
    if (settings.tagline) document.querySelector("meta[name='description']")?.setAttribute("content", settings.tagline);

    const origin = window.location.origin;
    const absolute = (url) => (url && url.startsWith("/") ? origin + url : url);
    const data = {
      "@context": "https://schema.org",
      "@type": "Church",
      name: settings.name,
      url: `${origin}/`,
      description: settings.tagline || undefined,
      logo: absolute(logo || "/logo.png"),
      image: absolute(safeUrl(settings.heroImage) || "/og-image.jpg"),
      address: settings.address || undefined,
      telephone: settings.phone || undefined,
      email: emailList(settings.email)[0],
      sameAs: [settings.instagramUrl, settings.facebookUrl].map(safeUrl).concat(youtubeChannelUrl(settings)).filter(Boolean),
    };
    let script = document.getElementById("church-jsonld");
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "church-jsonld";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }, [settings]);
}

export default function Layout() {
  const { site } = useSite();
  const { pathname } = useLocation();
  useSiteMetadata(site?.settings);
  useReveal(pathname);

  return (
    <div className="site-shell">
      <ScrollManager />
      <Header />
      <main id="main-content" key={pathname} className="page-enter">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
