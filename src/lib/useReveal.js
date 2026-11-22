import { useEffect } from "react";

// Blocks that fade and rise into view as the visitor scrolls. The home hero and page
// heroes have their own entrance animation, so they're not listed.
const REVEAL_SELECTOR = [
  ".section-heading",
  ".scripture__inner",
  ".welcome__copy",
  ".welcome__visual",
  ".pathway-card",
  ".message__content",
  ".visit__intro",
  ".visit__map-wrap",
  ".ministry-card",
  ".event-card",
  ".photo-grid__item",
  ".giving__content",
  ".about-story > *",
  ".about-pillars article",
  ".belief-list li",
  ".leader-card",
  ".ministry-row",
  ".live__offline-card",
  ".live__info",
  ".live__offline-photo",
  ".messages-empty",
  ".session",
  ".featured-message",
  ".sermon-card",
  ".give-card",
  ".give-note",
  ".contact__intro",
  ".contact-form",
  ".privacy > *",
  ".filter-chips",
  ".not-found > *",
].join(",");

const STAGGER_MS = 70;
const MAX_STAGGER_STEPS = 4;
const REVEAL_DURATION_MS = 750;

const motionAllowed = () =>
  typeof window !== "undefined" &&
  "IntersectionObserver" in window &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Gently reveals content blocks as they scroll into view, staggering siblings
 * (cards in a grid appear one after another). Re-runs for every page.
 */
export function useReveal(routeKey) {
  useEffect(() => {
    if (!motionAllowed()) return undefined;
    const root = document.getElementById("main-content");
    if (!root) return undefined;
    const timers = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          observer.unobserve(el);
          el.dataset.reveal = "in";
          const delay = parseInt(el.style.getPropertyValue("--reveal-delay"), 10) || 0;
          // Afterwards, drop the marker so normal hover transitions take over again.
          const timer = setTimeout(() => {
            timers.delete(timer);
            delete el.dataset.reveal;
            el.style.removeProperty("--reveal-delay");
          }, REVEAL_DURATION_MS + delay);
          timers.add(timer);
        }
      },
      { rootMargin: "0px 0px 8% 0px", threshold: 0 },
    );

    const prepare = () => {
      for (const el of root.querySelectorAll(REVEAL_SELECTOR)) {
        if (el.dataset.revealSeen) continue;
        el.dataset.revealSeen = "1";
        const siblings = [...(el.parentElement?.children || [])].filter((child) => child.matches(REVEAL_SELECTOR));
        const index = Math.max(0, siblings.indexOf(el));
        el.style.setProperty("--reveal-delay", `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms`);
        el.dataset.reveal = "pending";
        observer.observe(el);
      }
    };

    prepare();
    // Content that loads later (sermons, filtered lists, "show more") is picked up too.
    const mutations = new MutationObserver(prepare);
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      for (const timer of timers) clearTimeout(timer);
      // Never leave anything hidden if the page changes mid-animation, and forget what we
      // prepared so a re-run (React StrictMode runs effects twice in development) starts clean.
      for (const el of root.querySelectorAll("[data-reveal], [data-reveal-seen]")) {
        delete el.dataset.reveal;
        delete el.dataset.revealSeen;
        el.style.removeProperty("--reveal-delay");
      }
    };
  }, [routeKey]);
}
