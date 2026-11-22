import { useEffect, useRef } from "react";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
export const turnstileEnabled = Boolean(SITE_KEY);

let scriptPromise;
function loadScript() {
  scriptPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Spam check failed to load."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Cloudflare Turnstile widget. Renders nothing unless VITE_TURNSTILE_SITE_KEY is set. */
export default function Turnstile({ onToken }) {
  const container = useRef(null);
  const callback = useRef(onToken);
  callback.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let widgetId;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          size: "flexible",
          callback: (token) => callback.current(token),
          "expired-callback": () => callback.current(""),
          "error-callback": () => callback.current(""),
        });
      })
      .catch(() => callback.current(""));
    return () => {
      cancelled = true;
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div className="turnstile" ref={container} />;
}
