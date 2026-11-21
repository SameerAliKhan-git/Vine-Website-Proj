import { Link } from "react-router-dom";
import { useSite } from "../lib/SiteContext.jsx";

export default function BrandMark({ footer = false, onClick }) {
  const settings = useSite().site?.settings;
  const name = settings?.name || "The Vine Cell Church";
  return (
    <Link className={`brand ${footer ? "brand--footer" : ""}`} to="/" aria-label={`${name}, home`} onClick={onClick}>
      <span className="brand__mark" aria-hidden="true">
        <img src={settings?.logoUrl || "/logo.png"} alt="" />
      </span>
      <span className="brand__text">
        <span className="brand__name">{name}</span>
        <span className="brand__location">{settings?.location}</span>
      </span>
    </Link>
  );
}
