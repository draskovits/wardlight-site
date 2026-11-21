// Drives the detail views on a touch phone (Chrome, touch emulation through CDP, so the browser's own scrolling and
// scroll-snap run) and reports what is wrong: jumps while opening or closing (frame-to-frame), the page showing at the
// panel's edges, a drag that does not follow the finger, a swipe that does not page, a scrolled page that drags.
//
//   npm run build && npx astro preview --port 8660 &
//   node tools/check-sheets.mjs [--base http://127.0.0.1:8660] [--video out/]   (--video records each run as .webm)
import { chromium } from "playwright-core";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:8660");
const VIDEO = arg("--video", "");
const SIZES = [[375, 812], [390, 844]];
const PATHS = ["/", "/de/"];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "chrome", headless: true });
let problems = 0;
const bad = (where, msg) => { problems++; console.log(`  ✗ ${where}: ${msg}`); };

for (const path of PATHS) for (const [width, height] of SIZES) {
  const where = `${path} ${width}×${height}`;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    ...(VIDEO ? { recordVideo: { dir: VIDEO, size: { width, height } } } : {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  // a finger: down, moves in steps (one per frame), up
  const drag = async (x0, y0, x1, y1, steps = 16, hold = false) => {
    await touch("touchStart", x0, y0);
    for (let i = 1; i <= steps; i++) { await touch("touchMove", x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps); await wait(16); }
    if (!hold) await touch("touchEnd");
  };
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });

  // records the panel's visible box every frame while `fn` runs
  const film = async (fn, ms) => {
    await page.evaluate(() => {
      const w = window; w.__frames = []; w.__rec = true;
      const tick = () => {
        const d = document.querySelector("dialog[open][data-sheet]");
        if (d) {
          const p = d.querySelector(".panel"), r = p.getBoundingClientRect();
          w.__frames.push({ l: r.left, t: r.top, w: r.width, o: +getComputedStyle(p).opacity, at: performance.now() });
        }
        if (w.__rec) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await fn();
    await wait(ms);
    return page.evaluate(() => { window.__rec = false; return window.__frames; });
  };
  const jumps = (frames, label) => {
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1], b = frames[i];
      const d = Math.max(Math.abs(b.t - a.t), Math.abs(b.l - a.l), Math.abs(b.w - a.w)) / Math.max(1, (b.at - a.at) / 16.7); // per 60 Hz frame, so a dropped frame in the headless browser is not a jump
      if (d > height * 0.16) { bad(where, `${label}: jump of ${Math.round(d)} px between frames ${i - 1} and ${i}`); return; }
    }
  };
  const state = () => page.evaluate(() => {
    const d = document.querySelector("dialog[open][data-sheet]");
    if (!d) return null;
    const v = window.__sheets.get(d.id);
    const p = d.querySelector(".panel").getBoundingClientRect();
    return { id: d.id, t: v.t, dy: v.dy, index: v.index, state: v.state, top: p.top, bottom: p.bottom, left: p.left, right: p.right,
      scrollTop: v.current().scrollTop, pagerLeft: v.pager.scrollLeft, pagerW: v.pager.clientWidth, vh: innerHeight, vw: innerWidth };
  });
  const tapOn = async (sel) => {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await wait(400);
    const b = await el.boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  };

  for (const [sel, label] of [["[data-open=sheet-year]", "seasons"], [".land-tease[data-page='1']", "lands"], [".tile[data-page='2']", "elements"], ["[data-open=sheet-tree]", "growth"]]) {
    const frames = await film(() => tapOn(sel), 900);
    let s = await state();
    if (!s) { bad(where, `${label}: did not open`); continue; }
    jumps(frames, `${label} open`);
    if (frames.length && frames[0].o > 0.6) bad(where, `${label}: first frame already opaque (${frames[0].o})`);
    if (s.state !== "open" || Math.abs(s.t - 1) > 1e-3) bad(where, `${label}: not settled after 0.9 s (${s.state} t=${s.t.toFixed(3)})`);
    if (s.bottom < s.vh + 20) bad(where, `${label}: panel ends at ${Math.round(s.bottom)}, screen at ${s.vh}`);
    if (s.left > 0.5 || s.right < s.vw - 0.5) bad(where, `${label}: panel ${Math.round(s.left)}…${Math.round(s.right)} of ${s.vw}`);
    if (label === "lands" && s.index !== 1) bad(where, `lands opened on page ${s.index}, not 1`);
    if (label === "elements" && s.index !== 2) bad(where, `elements opened on page ${s.index}, not 2`);
    // every edge of the screen below the panel's top is the panel, never the page
    const leak = await page.evaluate(() => {
      const d = document.querySelector("dialog[open][data-sheet]"), p = d.querySelector(".panel"), top = p.getBoundingClientRect().top;
      const pts = [[1, innerHeight - 1], [innerWidth / 2, innerHeight - 1], [innerWidth - 2, innerHeight - 1], [1, top + 40], [innerWidth - 2, top + 40], [1, innerHeight / 2], [innerWidth - 2, innerHeight / 2]];
      return pts.filter(([x, y]) => !p.contains(document.elementFromPoint(x, y))).map(([x, y]) => `${Math.round(x)},${Math.round(y)}`);
    });
    if (leak.length) bad(where, `${label}: the page shows at ${leak.join(" ")}`);

    // a short pull springs back
    const mid = Math.round(height * 0.55);
    await drag(width / 2, mid, width / 2, mid + 70, 8);
    await wait(700);
    s = await state();
    if (!s || Math.abs(s.dy) > 1) bad(where, `${label}: a short pull did not spring back (${s ? s.dy.toFixed(1) : "closed"})`);

    if (label === "seasons") {
      // swipe sideways → next page, natively
      await drag(width * 0.85, mid, width * 0.15, mid, 10);
      await wait(900);
      s = await state();
      if (!s || s.index !== 1 || Math.abs(s.pagerLeft - s.pagerW) > 2) bad(where, `swipe did not land on page 2 (index ${s?.index}, left ${s?.pagerLeft})`);
      // scrolled down, a downward drag scrolls the content back, it does not move the panel
      await page.evaluate(() => { const d = document.querySelector("dialog[open][data-sheet]"); const c = window.__sheets.get(d.id).current(); c.style.paddingBottom = "900px"; c.scrollTop = 300; });
      await drag(width / 2, mid - 100, width / 2, mid + 20, 10, true);
      s = await state();
      if (s && s.dy > 2) bad(where, `dragging a scrolled page moved the panel (dy ${s.dy.toFixed(1)})`);
      await touch("touchEnd");
      await wait(500);
      await page.evaluate(() => { const d = document.querySelector("dialog[open][data-sheet]"); const c = window.__sheets.get(d.id).current(); c.style.paddingBottom = ""; c.scrollTop = 0; });
    }

    // the finger, held: the panel follows 1:1
    await drag(width / 2, mid, width / 2, mid + 200, 14, true);
    s = await state();
    if (!s || Math.abs(s.dy - 200) > 6) bad(where, `${label}: drag of 200 px moved the panel ${s ? s.dy.toFixed(1) : "?"} px`);
    // let go: it closes, back into where it came from, with no jump
    const closing = await film(() => touch("touchEnd"), 900);
    jumps(closing, `${label} close`);
    if (await state()) bad(where, `${label}: a 200 px pull did not close it`);
    const locked = await page.evaluate(() => document.documentElement.classList.contains("sheet-open"));
    if (locked) bad(where, `${label}: page still locked after closing`);
  }
  // Esc
  await tapOn("[data-open=sheet-year]");
  await wait(900);
  const before = await state();
  await page.keyboard.press("Escape");
  await wait(1000);
  const after = await state();
  if (after) bad(where, `Esc did not close (before: ${JSON.stringify(before)} after: ${after.state} t=${after.t})`);
  if (errors.length) bad(where, errors.join(" | "));
  await ctx.close();
  console.log(`${where}: checked`);
}

// desktop: arrow keys page, the panel's top drags with a mouse
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.locator(".land-tease:not(.all)[data-page='0']").scrollIntoViewIfNeeded();
  await wait(400);
  await page.locator(".land-tease:not(.all)[data-page='0']").click();
  await wait(900);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await wait(1200);
  const i = await page.evaluate(() => window.__sheets.get("sheet-land").index);
  if (i !== 2) bad("desktop", `arrow keys landed on ${i}, not 2`);
  const top = await page.locator("#sheet-land .sheet-top").boundingBox();
  await page.mouse.move(top.x + 80, top.y + 20);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) { await page.mouse.move(top.x + 80, top.y + 20 + k * 25); await wait(16); }
  await page.mouse.up();
  await wait(900);
  if (await page.evaluate(() => !!document.querySelector("dialog[open]"))) bad("desktop", "mouse drag of 300 px did not close");
  await ctx.close();
  console.log("desktop: checked");
}
await browser.close();
console.log(problems ? `${problems} problem(s)` : "All detail views behave.");
process.exit(problems ? 1 : 0);
