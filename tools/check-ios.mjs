// iPhone checks in Chrome (no WebKit binary here): the safe areas emulated through CDP
// (Emulation.setSafeAreaInsetsOverride), portrait and landscape, and the device settings Safari passes on.
// Reports anything fixed or pinned that sits in an inset, the page scrolling sideways, a detail view or the lightbox
// whose controls sit under the Dynamic Island or the home indicator, and what reduced transparency, more contrast,
// reduced motion and 150 % text (as a 262 px wide layout) change.
//
//   npm run build && npx astro preview --port 8660 &
//   node tools/check-ios.mjs [--base http://127.0.0.1:8660] [--shots dir]
import { chromium } from "playwright-core";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:8660");
const SHOTS = arg("--shots", "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// iPhone 16 Pro: 402 × 874 points, Dynamic Island 62 top, home indicator 34; landscape 62 left/right, 21 bottom
const DEVICES = [
  { name: "portrait", w: 402, h: 874, insets: { top: 62, bottom: 34, left: 0, right: 0 } },
  { name: "landscape", w: 874, h: 402, insets: { top: 0, bottom: 21, left: 62, right: 62 } },
];
const browser = await chromium.launch({ channel: "chrome", headless: true });
let problems = 0;
const bad = (where, msg) => { problems++; console.log(`  ✗ ${where}: ${msg}`); };

const inside = (r, d, label) => {
  const out = [];
  const i = d.insets;
  if (r.top < i.top - 0.5 && r.bottom > 0 && r.top > -1) out.push(`${label} top ${Math.round(r.top)} < ${i.top}`);
  if (r.bottom > d.h - i.bottom + 0.5 && r.top < d.h) out.push(`${label} bottom ${Math.round(r.bottom)} > ${d.h - i.bottom}`);
  if (r.left < i.left - 0.5) out.push(`${label} left ${Math.round(r.left)} < ${i.left}`);
  if (r.right > d.w - i.right + 0.5) out.push(`${label} right ${Math.round(r.right)} > ${d.w - i.right}`);
  return out;
};

for (const path of ["/", "/de/"]) for (const d of DEVICES) {
  const where = `${path} ${d.name}`;
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  try { await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: d.insets }); }
  catch (e) { console.log("  (this Chrome cannot emulate safe areas: " + e.message + ")"); }
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const rects = (sels) => page.evaluate((sels) => sels.map((s) => {
    const el = document.querySelector(s); if (!el) return null;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width && cs.visibility !== "hidden" && +cs.opacity > 0.05 ? { s, top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null;
  }), sels);
  // the top of the page: wordmark, nav, the film's year bar and headline
  for (const r of (await rects([".bar .home img", ".bar nav", ".film .when-bar .tick", ".film .beat.first h1", ".film .act"])).filter(Boolean))
    for (const m of inside(r, d, r.s)) bad(where, m);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ios-${d.name}${path === "/" ? "" : "-de"}-top.png` });
  // the film's last beat (night) and the night counter further down
  await page.evaluate(() => { const f = document.querySelector("[data-film]"); scrollTo(0, f.offsetTop + (f.offsetHeight - innerHeight) * 0.92); });
  await wait(900);
  for (const r of (await rects([".film .beat.line.night"])).filter(Boolean)) for (const m of inside(r, d, r.s)) bad(where, m);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ios-${d.name}${path === "/" ? "" : "-de"}-night.png` });
  await page.evaluate(() => scrollTo(0, document.querySelector("#lands").offsetTop));
  await wait(700);
  for (const r of (await rects([".clock"])).filter(Boolean)) for (const m of inside(r, d, r.s)) bad(where, m);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (sideways > 1) bad(where, `page scrolls sideways by ${sideways}px`);
  // every text block of the page stays clear of the side insets (landscape)
  if (d.insets.left) {
    const off = await page.evaluate((L) => [...document.querySelectorAll("main h2, main p, main li, main figcaption, .bar a")]
      .filter((el) => !el.closest("dialog") && !el.closest(".strip-x")).map((el) => [el, el.getBoundingClientRect()])
      .filter(([, r]) => r.width && r.height && (r.left < L - 0.5 || r.right > innerWidth - L + 0.5))
      .map(([el]) => (el.textContent || "").trim().slice(0, 30)).slice(0, 5), d.insets.left);
    if (off.length) bad(where, `text in the side insets: ${off.join(" | ")}`);
  }
  // a detail view and the lightbox: their controls clear of the insets
  await page.evaluate(() => window.__sheets.get("sheet-land").open(null, 2));
  await wait(1200);
  for (const r of (await rects(["#sheet-land .x", "#sheet-land .path", "#sheet-land .leaf:nth-child(3) .sheet-title"])).filter(Boolean)) for (const m of inside(r, d, r.s)) bad(where, m);
  const bottomEdge = await page.evaluate(() => { const p = document.querySelector("#sheet-land .panel").getBoundingClientRect(); return p.bottom - innerHeight; });
  if (bottomEdge < 20) bad(where, `the panel ends ${Math.round(-bottomEdge)} px above the screen's bottom edge`);
  const lastPad = await page.evaluate(() => { const l = window.__sheets.get("sheet-land").current(); l.scrollTop = 1e6; const last = l.querySelector(".page-in").lastElementChild.getBoundingClientRect(); return innerHeight - last.bottom; });
  if (lastPad < d.insets.bottom) bad(where, `the last line of a detail view ends ${Math.round(lastPad)} px from the bottom (home indicator ${d.insets.bottom})`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ios-${d.name}${path === "/" ? "" : "-de"}-sheet.png` });
  await page.keyboard.press("Escape");
  await wait(800);
  await page.locator("[data-shot]").first().scrollIntoViewIfNeeded();
  await page.locator("[data-shot]").first().click();
  await wait(700);
  for (const r of (await rects(["#lightbox .x", "#lightbox .cap p"])).filter(Boolean)) for (const m of inside(r, d, r.s)) bad(where, m);
  await page.keyboard.press("Escape");
  await ctx.close();
  console.log(`${where}: checked`);
}

// device settings
{
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "reduce", contrast: "more" });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }, { name: "prefers-contrast", value: "more" }, { name: "prefers-reduced-motion", value: "reduce" }] });
  await page.goto(BASE + "/", { waitUntil: "load" });
  const r = await page.evaluate(async () => {
    const v = window.__sheets.get("sheet-year");
    v.open(null, 0);
    await new Promise((r) => setTimeout(r, 600));
    const scrim = getComputedStyle(document.querySelector("#sheet-year .scrim"));
    const out = { blur: scrim.backdropFilter, ink2: getComputedStyle(document.documentElement).getPropertyValue("--ink-2").trim(), state: v.state,
      transform: document.querySelector("#sheet-year .panel").style.transform, film: getComputedStyle(document.querySelector(".film")).height };
    v.close();
    return out;
  });
  if (r.blur && r.blur !== "none") bad("reduced transparency", `scrim still blurs (${r.blur})`);
  if (r.ink2 !== "#e9e0cc") bad("more contrast", `--ink-2 is ${r.ink2}`);
  if (r.state !== "open" || /scale\((?!1\))/.test(r.transform)) bad("reduced motion", `detail view did not simply fade (${r.state}, ${r.transform})`);
  await ctx.close();
  console.log("device settings: checked");
}
// 150 % text: Safari's page zoom makes the layout narrower; 402 / 1.5 ≈ 268
{
  const ctx = await browser.newContext({ viewport: { width: 268, height: 583 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
  const over = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth, out = [];
    if (document.documentElement.scrollWidth > vw + 1) out.push(`page ${document.documentElement.scrollWidth} > ${vw}`);
    for (const el of document.querySelectorAll("main h1, main h2, main h3, main p, main li, .bar a, .more")) {
      if (el.closest(".strip-x") || el.closest("dialog")) continue;
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > vw + 1 || r.left < -1)) out.push((el.textContent || "").trim().slice(0, 30));
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible") out.push("clipped: " + (el.textContent || "").trim().slice(0, 30));
    }
    return out.slice(0, 8);
  });
  if (over.length) bad("150 % text", over.join(" | "));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ios-zoom150-top.png` });
  await page.evaluate(() => window.__sheets.get("sheet-element").open(null, 0));
  await wait(1200);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ios-zoom150-sheet.png` });
  await ctx.close();
  console.log("150 % text: checked");
}
await browser.close();
console.log(problems ? `${problems} problem(s)` : "iPhone checks pass.");
process.exit(problems ? 1 : 0);
