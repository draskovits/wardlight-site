// playwardlight.com, built by Astro into dist/ and published to GitHub Pages (.github/workflows/pages.yml).
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://playwardlight.com",
  // keep every old URL: support.astro → /support.html, press/index.astro → /press/index.html (served as /press/)
  build: { format: "preserve", inlineStylesheets: "always", assets: "_astro" },
  trailingSlash: "ignore",
  compressHTML: true,
  devToolbar: { enabled: false },
  server: { port: 8660 },
});
