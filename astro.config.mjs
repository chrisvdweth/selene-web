import { defineConfig } from "astro/config";
import react from "@astrojs/react";
const site = process.env.SITE_URL || process.env.CF_PAGES_URL || "http://localhost:4321";
export default defineConfig({
  site,
  integrations: [react()],
  vite: {
    /* The d3 modules are only imported by one island. Left to be discovered
       on first visit, Vite re-optimises mid-session and the page can end up
       with two copies of React ("Invalid hook call", blank island). Naming
       them here bundles everything once, at startup. */
    optimizeDeps: { include: ["react", "react-dom", "react-dom/client", "d3-selection", "d3-zoom"] },
  },
});
