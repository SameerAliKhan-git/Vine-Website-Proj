import { Link } from "react-router-dom";
import { safeUrl } from "../lib/format.js";
import { useSite } from "../lib/SiteContext.jsx";

// Official church logos: the round colour logo (light backgrounds) and the white
// horizontal logo (dark backgrounds such as the footer).
export default function BrandMark({ footer = false, onClick }) {
  const settings = useSite().site?.settings;
  const name = settings?.name || "Vine India";

  if (footer) {
    return (
      <Link className="brand brand--footer" to="/" aria-label={`${name}, home`} onClick={onClick}>
        <img className="brand__wordmark" src="/logo-white.png" alt="" width="605" height="160" />
        {settings?.location && <span className="brand__location">{settings.location}</span>}
      </Link>
    );
  }

  return (
    <Link className="brand" to="/" aria-label={`${name}, home`} onClick={onClick}>
      <span className="brand__mark" aria-hidden="true">
        <img src={safeUrl(settings?.logoUrl) || "/logo.png"} alt="" width="48" height="48" />
      </span>
      <span className="brand__text">
        <span className="brand__name">{name}</span>
        <span className="brand__location">{settings?.location}</span>
      </span>
    </Link>
  );
}
