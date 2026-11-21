import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CirclePlay } from "lucide-react";

export function ArrowLink({ to, children, light = false }) {
  const className = `arrow-link ${light ? "arrow-link--light" : ""}`;
  const content = (
    <>
      <span>{children}</span>
      <ArrowUpRight size={17} strokeWidth={1.8} aria-hidden="true" />
    </>
  );
  if (/^https?:/.test(to)) {
    return (
      <a className={className} href={to} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link className={className} to={to}>
      {content}
    </Link>
  );
}

/** Smart link: internal routes use the router, external links open in a new tab. */
export function SmartLink({ to, children, ...props }) {
  if (!to) return null;
  if (to.startsWith("/")) {
    return (
      <Link to={to} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  );
}

export function PageHero({ eyebrow, title, accent, children, image }) {
  return (
    <section className="page-hero" style={image ? { "--page-hero-image": `url("${image}")` } : undefined}>
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
