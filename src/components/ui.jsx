import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CirclePlay } from "lucide-react";
import { cssUrl, isInternal, safeUrl } from "../lib/format.js";
import { pageHeading } from "../lib/pageText.js";
import { useSite } from "../lib/SiteContext.jsx";

export function ArrowLink({ to, children, light = false }) {
  return (
    <SmartLink to={to} className={`arrow-link ${light ? "arrow-link--light" : ""}`}>
      <span>{children}</span>
      <ArrowUpRight size={17} strokeWidth={1.8} aria-hidden="true" />
    </SmartLink>
  );
}

/**
 * Smart link: internal routes use the router, external links open in a new tab.
 * Anything that isn't http(s), mailto:, tel: or a same-site path renders nothing.
 */
export function SmartLink({ to, children, ...props }) {
  const href = safeUrl(to);
  if (!href) return null;
  if (isInternal(href)) {
    return (
      <Link to={href} {...props}>
        {children}
      </Link>
    );
  }
  if (/^(mailto|tel):/i.test(href)) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  );
}

export function PageHero({ page, eyebrow, title, accent, children, image }) {
  const settings = useSite()?.site?.settings;
  ({ eyebrow, title, accent, image, intro: children } = pageHeading(settings, page, { eyebrow, title, accent, image, intro: children }));
  const background = cssUrl(image);
  return (
    <section className="page-hero" style={background ? { "--page-hero-image": background } : undefined}>
      <div className="page-hero__inner">
        <span className="section-number section-number--light">{eyebrow}</span>
        <h1>
          {title} {accent && <em>{accent}</em>}
        </h1>
        {children && <p>{children}</p>}
      </div>
    </section>
  );
}

/** YouTube player that only loads the iframe once someone presses play (fast pages). */
export function VideoEmbed({ src, title, thumbnail, autoLoad = false }) {
  const [active, setActive] = useState(autoLoad || !thumbnail);
  useEffect(() => setActive(autoLoad || !thumbnail), [src, autoLoad, thumbnail]);

  return (
    <div className="video-frame">
      {active ? (
        <iframe
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button type="button" className="video-frame__poster" onClick={() => setActive(true)}>
          <img src={thumbnail} alt="" loading="lazy" />
          <span className="video-frame__play">
            <CirclePlay size={54} strokeWidth={1.2} aria-hidden="true" />
            <span className="sr-only">Play {title}</span>
          </span>
        </button>
      )}
    </div>
  );
}

export function Countdown({ target }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const diff = Math.max(0, target - now);
  const parts = [
    ["Days", Math.floor(diff / 86_400_000)],
    ["Hours", Math.floor(diff / 3_600_000) % 24],
    ["Mins", Math.floor(diff / 60_000) % 60],
    ["Secs", Math.floor(diff / 1000) % 60],
  ];
  return (
    <div className="countdown" role="timer" aria-label="Time until the next service">
      {parts.map(([label, value]) => (
        <span key={label} className="countdown__part">
          <strong>{String(value).padStart(2, "0")}</strong>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}

export function Loading({ label = "Loading…" }) {
  return (
    <div className="loading" role="status">
      <span className="loading__dot" />
      {label}
    </div>
  );
}
