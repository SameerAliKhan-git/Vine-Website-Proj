import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { normalizeSite } from "./defaults.js";
import { configError } from "./supabase.js";
import snapshot from "./site-snapshot.json";

const SiteContext = createContext(null);
const CACHE_KEY = "vine-site-cache-v1";
const REFRESH_MS = 30_000;

function readCache() {
  try {
    return normalizeSite(JSON.parse(localStorage.getItem(CACHE_KEY)));
  } catch {
    return null;
  }
}

export function SiteProvider({ children }) {
  // Never make visitors wait: show this browser's last copy, or the copy bundled at build
  // time, straight away, then swap in the live data as soon as it arrives.
  const [site, setSite] = useState(() => readCache() || normalizeSite(snapshot));
  const [error, setError] = useState(configError ? new Error(configError) : null);

  const refresh = useCallback(() => {
    if (configError) return;
    api
      .site()
      .then((data) => {
        const next = normalizeSite(data);
        setSite(next);
        setError(null);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          /* storage full or blocked */
        }
      })
      .catch(setError);
  }, []);

  useEffect(() => {
    refresh();
    // Keep the live status fresh for people sitting on the page, but only while it's visible.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return <SiteContext.Provider value={{ site, error, refresh }}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}

const sermonCache = { promise: null, at: 0 };

export function useSermons() {
  const [state, setState] = useState({ sermons: [], loading: true, error: null });
  // A stream that is live now or still scheduled isn't a "previous" message yet.
  const pending = useContext(SiteContext)?.site?.youtube?.live;
  const hiddenId = pending && (pending.status === "live" || pending.status === "upcoming") ? pending.videoId : null;
  useEffect(() => {
    let active = true;
    if (!sermonCache.promise || Date.now() - sermonCache.at > 5 * 60_000) {
      sermonCache.promise = api.sermons();
      sermonCache.at = Date.now();
    }
    sermonCache.promise
      .then((sermons) => active && setState({ sermons, loading: false, error: null }))
      .catch((error) => {
        sermonCache.promise = null;
        if (active) setState({ sermons: [], loading: false, error });
      });
    return () => {
      active = false;
    };
  }, []);
  return useMemo(
    () => (hiddenId ? { ...state, sermons: state.sermons.filter((s) => s.videoId !== hiddenId) } : state),
    [state, hiddenId],
  );
}

export function clearSermonCache() {
  sermonCache.promise = null;
}
