import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Facebook, Instagram, Mail, MapPin, Menu, Phone, Radio, X, Youtube } from "lucide-react";
import BrandMark from "./BrandMark.jsx";
import { SmartLink } from "./ui.jsx";
import { useSite } from "../lib/SiteContext.jsx";
import { emailList, phoneList, telHref } from "../lib/format.js";

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
      <span>{settings.announcementText}</span>
      {settings.announcementLink && (
        <SmartLink to={settings.announcementLink}>
          {settings.announcementLinkText || "Learn more"} <ArrowRight size={13} aria-hidden="true" />
        </SmartLink>
      )}
    </div>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const { site } = useSite();
  const closeMenu = () => setMenuOpen(false);

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
      <header className="site-header">
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
  const socials = [
    { href: settings.youtubeUrl, label: "YouTube", Icon: Youtube },
    { href: settings.instagramUrl, label: "Instagram", Icon: Instagram },
    { href: settings.facebookUrl, label: "Facebook", Icon: Facebook },
  ].filter((s) => s.href);

  return (
    <footer className="footer" id="contact">
      <div className="footer__main">
        <div className="footer__brand">
          <BrandMark footer />
          <p>{settings.tagline}</p>
          {socials.length > 0 && (
            <div className="footer__socials">
              {socials.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
                  <Icon size={17} aria-hidden="true" />
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
          <span className="footer__address">
            <MapPin size={14} aria-hidden="true" /> {settings.address}
          </span>
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

export default function Layout() {
  const { site } = useSite();
  useEffect(() => {
    if (site?.settings.name) {
      const favicon = document.querySelector("link[rel='icon']");
      if (favicon && site.settings.logoUrl) favicon.href = site.settings.logoUrl;
    }
  }, [site?.settings.name, site?.settings.logoUrl]);

  return (
    <div className="site-shell">
      <ScrollManager />
      <Header />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
