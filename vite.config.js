import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const PUBLIC_ROUTES = ["/", "/about", "/services", "/activities", "/ministries", "/gallery", "/visit", "/give", "/privacy"];

/** Writes robots.txt and sitemap.xml for the production domain (VITE_SITE_URL). */
function seoFiles(siteUrl) {
  return {
    name: "seo-files",
    apply: "build",
    generateBundle() {
      const base = (siteUrl || "").replace(/\/+$/, "");
      const robots = ["User-agent: *", "Allow: /", "Disallow: /admin", base && `Sitemap: ${base}/sitemap.xml`]
        .filter(Boolean)
        .join("\n");
      this.emitFile({ type: "asset", fileName: "robots.txt", source: `${robots}\n` });
      if (!base) {
        this.warn("VITE_SITE_URL is not set: sitemap.xml was skipped and share previews will use relative URLs.");
        return;
      }
      const urls = PUBLIC_ROUTES.map((path) => `  <url><loc>${base}${path === "/" ? "/" : path}</loc></url>`).join("\n");
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    server: {
      host: true,
      allowedHosts: true,
    },
    // `npm run preview` serves the optimised production build: use it (not `npm run dev`)
    // when sharing the site through a tunnel for remote review.
    preview: {
      host: true,
      port: 5173,
      allowedHosts: true,
    },
    plugins: [react(), tailwindcss(), seoFiles(env.VITE_SITE_URL)],
    build: {
      rollupOptions: {
        output: {
          manualChunks: { supabase: ["@supabase/supabase-js"], react: ["react", "react-dom", "react-router-dom"] },
        },
      },
    },
  };
});
