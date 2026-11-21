import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [site, setSite] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    api
      .get("/api/site")
      .then((data) => {
        setSite(data);
        setError(null);
      })
      .catch(setError);
  }, []);

  useEffect(() => {
    refresh();
    // Keep the live status fresh for people sitting on the page.
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return <SiteContext.Provider value={{ site, error, refresh }}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}

const sermonCache = { promise: null, at: 0 };

export function useSermons() {
  const [state, setState] = useState({ sermons: [], loading: true, error: null });
  useEffect(() => {
    let active = true;
    if (!sermonCache.promise || Date.now() - sermonCache.at > 5 * 60_000) {
      sermonCache.promise = api.get("/api/sermons");
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
  return state;
}
