import { useEffect } from "react";
import { useSite } from "./SiteContext.jsx";

export function usePageTitle(title) {
  const name = useSite().site?.settings.name || "Vine India";
  useEffect(() => {
    document.title = title ? `${title} · ${name}` : `${name} — A place to grow`;
  }, [title, name]);
}
