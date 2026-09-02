import { defineConfig } from "vite";

// Served from https://<user>.github.io/freeshow-multilingual/ (a GitHub Pages
// project site), so assets must be requested under that subpath in production.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/freeshow-multilingual/" : "/",
});
