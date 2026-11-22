// The detail views in WebKit (Playwright's WebKit, iPhone 15 Pro descriptor, portrait and landscape): the frosted
// bar over the content, the last line clear of the bottom (≥ 80 px for Safari's floating toolbar), the panel covering
// the screen's edges, and seasons/growth as one vertical page. Playwright cannot draw Safari's toolbar or the safe
// areas, so the 80 px stand in for them.
//
//   npx playwright-core install webkit   (once)
//   npm run build && npx astro preview --port 8660 &
//   node tools/check-webkit.mjs [--base http://127.0.0.1:8660] [--shots dir]
import { webkit, devices } from "playwright-core";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:8660");
const SHOTS = arg("--shots", "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await webkit.launch();
let problems = 0;
const bad = (where, msg) => { problems++; console.log(`  ✗ ${where}: ${msg}`); };
const phone = devices["iPhone 15 Pro"];

for (const orient of ["portrait", "landscape"]) for (const path of ["/", "/de/"]) {
  const vp = orient === "portrait" ? phone.viewport : { width: phone.viewport.height, height: phone.viewport.width };
  const ctx = await browser.newContext({ ...phone, viewport: vp });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + path, { waitUntil: "load" });
  for (const [id, n] of [["sheet-year", 1], ["sheet-tree", 1], ["sheet-element", 3], ["sheet-land", 6]]) {
    const where = `${path} ${orient} ${id}`;
    await page.evaluate((id) => window.__sheets.get(id).open(null, 0), id);
    await wait(1300);
    const r = await page.evaluate((id) => {
      const v = window.__sheets.get(id), d = v.d, leaf = v.current();
      const bar = d.querySelector(".sheet-top"), cs = getComputedStyle(bar);
      const blur = cs.backdropFilter || cs.webkitBackdropFilter || "";
      const b = bar.getBoundingClientRect(), first = leaf.firstElementChild.getBoundingClientRect();
      const p = d.querySelector(".panel").getBoundingClientRect();
      const top = { under: first.top < b.bottom - 10, blur, state: v.state, panelBottom: p.bottom - innerHeight, pages: v.pages.length };
      leaf.scrollTop = 1e6;
      return top;
    }, id);
    await wait(400);
    const room = await page.evaluate((id) => {
      const leaf = window.__sheets.get(id).current();
      const last = [...leaf.querySelectorAll(".page-in")].pop().lastElementChild.getBoundingClientRect();
      return innerHeight - last.bottom;
    }, id);
    if (r.state !== "open") bad(where, `not open (${r.state})`);
    if (!r.under) bad(where, "content starts below the bar");
    if (!/blur/.test(r.blur)) bad(where, `bar not frosted (${r.blur || "none"})`);
    if (r.panelBottom < 20) bad(where, `panel ends ${Math.round(-r.panelBottom)} px above the bottom edge`);
    if (r.pages !== n) bad(where, `${r.pages} pages, expected ${n}`);
    if (room < 80) bad(where, `last line ${Math.round(room)} px from the bottom (needs ≥ 80)`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/wk-${orient}${path === "/" ? "" : "-de"}-${id}-end.png` });
    await page.evaluate((id) => { const v = window.__sheets.get(id); v.current().scrollTop = 0; }, id);
    if (SHOTS && path === "/") { await wait(300); await page.screenshot({ path: `${SHOTS}/wk-${orient}-${id}-top.png` }); }
    await page.evaluate((id) => window.__sheets.get(id).close(), id);
    await wait(1400);
  }
  if (errors.length) bad(`${path} ${orient}`, errors.join(" | "));
  await ctx.close();
  console.log(`${path} ${orient}: checked`);
}
await browser.close();
console.log(problems ? `${problems} problem(s)` : "WebKit: the detail views pass.");
process.exit(problems ? 1 : 0);
