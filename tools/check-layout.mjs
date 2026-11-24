// Loads every page at phone, tablet and desktop widths in headless Chrome and reports what does not fit:
// horizontal page scroll, elements that stick out past the viewport (outside sideways strips), images drawn much
// larger than their pixels (blurry), images squashed, console errors, broken JSON-LD and failed requests.
//
//   npm run build && npx astro preview --port 8660 &   (or any static server on dist/)
//   npm run check:layout [-- --base http://127.0.0.1:8660 --shots out/]
//
// Needs Google Chrome installed (playwright-core drives it; no browser download).
import { chromium } from "playwright-core";
import fs from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:8660");
const SHOTS = arg("--shots", "");
const WIDTHS = [375, 390, 430, 768, 1024, 1440];
const PAGES = ["/", "/de/", "/blog/", "/blog/wardlight-comes-out-on-3-december/", "/press/", "/support.html", "/datenschutz.html", "/impressum.html", "/guide/", "/guide/village-buildings/", "/guide/the-blight/", "/guide/states-and-synergies/"];

const browser = await chromium.launch({ channel: "chrome", headless: true });
let problems = 0;
for (const path of PAGES) {
  for (const width of WIDTHS) {
    const height = width < 768 ? 844 : width < 1100 ? 1024 : 900;
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width < 768 ? 3 : 2, isMobile: width < 768, hasTouch: width < 1024 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("requestfailed", (r) => { if (!r.url().includes("telemetrydeck")) errors.push("failed: " + r.url()); });
    page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("telemetrydeck")) errors.push(`${r.status()}: ${r.url()}`); });
    await page.goto(BASE + path, { waitUntil: "load" });
    // walk the page so lazy pictures load and reveals run
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.7) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
      scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 600));
    });
    const report = await page.evaluate(async () => {
      const out = { overflow: [], blurry: [], squashed: [], ld: [] };
      const vw = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > vw + 1) out.overflow.push(`page scrolls sideways: ${document.documentElement.scrollWidth} > ${vw}`);
      const insideStrip = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const cs = getComputedStyle(p); if (["auto", "scroll", "hidden", "clip"].includes(cs.overflowX) && p !== document.body && p !== document.documentElement) return true; if (p.tagName === "DIALOG" && !p.open) return true; } return false; };
      const label = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "");
      for (const el of document.querySelectorAll("main *, header *, footer *")) {
        const r = el.getBoundingClientRect();
        if (!r.width || insideStrip(el)) continue;
        if (r.right > vw + 1 || r.left < -1) out.overflow.push(`${label(el)} ${Math.round(r.left)}…${Math.round(r.right)} of ${vw}: "${(el.textContent || "").trim().slice(0, 40)}"`);
      }
      for (const img of document.querySelectorAll("img")) {
        if (!img.complete || !img.naturalWidth) continue;
        const r = img.getBoundingClientRect();
        if (!r.width || img.closest("dialog:not([open])")) continue;
        const cs = getComputedStyle(img);
        const need = r.width * devicePixelRatio;
        // with srcset, naturalWidth is in CSS pixels; load the chosen file on its own to get its real pixels
        let px = img.naturalWidth;
        if (img.srcset || img.parentElement?.tagName === "PICTURE") { const probe = new Image(); probe.src = img.currentSrc; try { await probe.decode(); px = probe.naturalWidth; } catch {} }
        // softer than half the screen's pixels counts as blurry on a 3x phone
        if (px < need / 2 && !img.currentSrc.endsWith(".svg")) out.blurry.push(`${img.currentSrc.split("/").slice(-2).join("/")} ${px}px for ${Math.round(need)} device px`);
        if (cs.objectFit !== "cover" && cs.objectFit !== "contain") {
          const a = img.naturalWidth / img.naturalHeight, b = r.width / r.height;
          if (Math.abs(a - b) / a > 0.03) out.squashed.push(`${img.currentSrc.split("/").slice(-2).join("/")} drawn ${b.toFixed(2)} vs ${a.toFixed(2)}`);
        }
      }
      for (const s of document.querySelectorAll('script[type="application/ld+json"]')) { try { JSON.parse(s.textContent); } catch (e) { out.ld.push(String(e)); } }
      return out;
    });
    const all = [...report.overflow, ...report.squashed.map((s) => "squashed " + s), ...report.ld.map((s) => "JSON-LD " + s), ...errors];
    const blurry = [...new Set(report.blurry)];
    if (all.length || blurry.length) {
      console.log(`\n${path} @ ${width}px`);
      all.forEach((l) => console.log("  ✗ " + l));
      blurry.forEach((l) => console.log("  ~ soft " + l));
      problems += all.length;
    }
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SHOTS}/${path.replace(/\W+/g, "_") || "home"}-${width}.png`, fullPage: false });
    }
    await ctx.close();
  }
}
await browser.close();
console.log(problems ? `\n${problems} problem(s).` : "\nNo layout problems.");
process.exit(problems ? 1 : 0);
