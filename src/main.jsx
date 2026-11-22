import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { SiteProvider } from "./lib/SiteContext.jsx";
import "./index.css";
import "./motion.css";

// Switch on the web fonts (they downloaded in the background without blocking the page).
const fonts = document.getElementById("site-fonts");
if (fonts) fonts.media = "all";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <SiteProvider>
        <App />
      </SiteProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

// Fade the preloader out once the first screen has painted.
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    const preloader = document.getElementById("preloader");
    if (!preloader) return;
    preloader.classList.add("is-done");
    setTimeout(() => preloader.remove(), 450);
  }),
);
