// playwardlight.com, the home page: the scroll film, reveals, the loops, the sheets of light, the lands, the
// gallery, the story with its Rive characters, the night counter. The detail views live in sheet.ts. Transforms and opacity only.
import { animate, inView, scroll, stagger } from "motion";
import { sheets, lockScroll, unlockScroll } from "./sheet";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Save-Data or a slow connection: the film keeps its poster, the Rive figures their stills
const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
const saveData = conn?.saveData === true || /(^|-)2g|3g/.test(conn?.effectiveType ?? "");
const root = document.documentElement;
const $ = <T extends Element = HTMLElement>(sel: string, el: ParentNode = document) => el.querySelector(sel) as T | null;
const $$ = <T extends Element = HTMLElement>(sel: string, el: ParentNode = document) => [...el.querySelectorAll(sel)] as T[];
const EASE = [0.2, 0.7, 0.2, 1] as const;

// ================================================================ the film
// The section is 340svh tall and its .pin sticks; the scroll's place in it (0…1) picks a frame of the village's year,
// cross-faded on a canvas, and fades the text beats in and out. The canvas redraws only when the frame changes.
function film() {
  const film = $("[data-film]");
  if (!film) return;
  const FRAMES = +(film.dataset.frames ?? 105);
  const ticks: string[] = JSON.parse(film.dataset.ticks ?? "[]");
  const beats = $$("[data-beat]", film).map((el) => ({ el, r: el.dataset.beat!.split(" ").map(Number) as [number, number] }));
  const tick = $(".when-bar .tick", film), yearLine = $(".year-line", film);
  const canvas = $<HTMLCanvasElement>("canvas", film)!;
  const ctx = canvas.getContext("2d", { alpha: false });
  const ease = (t: number) => t * t * (3 - 2 * t);
  const fade = 0.045;
  // scroll → frame: the bare heart while "Day one" reads, growth under "You build only…", winter under "By winter",
  // the night's frames under "Then night comes" (the knots fit the 105-frame take)
  const knots: [number, number][] = [[0, 0], [0.18, 0], [0.36, 9], [0.58, 39], [0.76, 50], [1, FRAMES - 1]];
  const frameAt = (p: number) => {
    for (let j = 1; j < knots.length; j++) if (p <= knots[j][0]) {
      const [p0, f0] = knots[j - 1], [p1, f1] = knots[j];
      return f0 + (f1 - f0) * ((p - p0) / Math.max(1e-6, p1 - p0));
    }
    return FRAMES - 1;
  };
  const when = (f: number) => ticks[f < 10 ? 0 : f < 20 ? 1 : f < 30 ? 2 : f < 40 ? 3 : f < 53 ? 4 : f < 78 ? 5 : 6] ?? "";

  // frames: a tall set for portrait screens, a wide one otherwise; the first ones first, then every 8th, 4th, 2nd…
  const useFrames = !reduce && !saveData && !!ctx;
  const tall = innerWidth / innerHeight < 1;
  const path = tall ? film.dataset.tall! : film.dataset.wide!;
  const frames: (HTMLImageElement | undefined)[] = new Array(FRAMES);
  const ready = (i: number) => { const im = frames[i]; return !!im && im.complete && im.naturalWidth > 0; };
  let drawn = "";
  const load = (i: number) => {
    if (frames[i]) return frames[i]!;
    const im = new Image();
    im.decoding = "async";
    im.src = path + String(i + 1).padStart(3, "0") + ".webp";
    frames[i] = im;
    return im;
  };
  const startLoading = () => {
    const order: number[] = [];
    const seen = new Set<number>();
    for (const step of [1e9, 8, 4, 2, 1]) for (let i = 0; i < FRAMES; i += Math.min(step, FRAMES)) if (!seen.has(i)) { seen.add(i); order.push(i); }
    let k = 0;
    const next = () => {
      const batch = order.slice(k, k + 6); k += 6;
      let left = batch.length;
      batch.forEach((i) => {
        const im = load(i);
        const done = () => { if (i === 0) film.classList.add("has-frames"); drawn = ""; schedule(); if (--left === 0) next(); };
        if (im.complete) done(); else { im.addEventListener("load", done, { once: true }); im.addEventListener("error", done, { once: true }); }
      });
    };
    next();
  };
  let cw = 0, ch = 0;
  const size = () => {
    const r = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * r), h = Math.round(canvas.clientHeight * r);
    if (w === cw && h === ch) return; // iOS fires resize as the toolbars move; the svh pin does not change
    canvas.width = cw = w; canvas.height = ch = h; drawn = "";
  };
  const paint = (im: HTMLImageElement, alpha: number) => {
    const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx!.globalAlpha = alpha;
    ctx!.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    ctx!.globalAlpha = 1;
  };
  const draw = (p: number) => {
    if (!useFrames) return;
    const f = frameAt(p);
    let a = Math.floor(f), t = f - a, b = Math.min(FRAMES - 1, a + 1);
    load(a); load(b);
    let up = a;
    while (up < FRAMES - 1 && !ready(up) && up - a < 6) up++;
    while (a > 0 && !ready(a)) a--;
    if (ready(up) && Math.abs(up - f) < Math.abs(a - f)) { a = up; t = 0; }
    if (!ready(a)) return;
    if (!ready(b)) { b = a; t = 0; }
    const key = a + ":" + b + ":" + t.toFixed(2);
    if (key === drawn) return;
    paint(frames[a]!, 1);
    if (t > 0.02 && b !== a) paint(frames[b]!, t);
    drawn = key;
  };

  let tickText = "", night = false, lastP = -1;
  const update = () => {
    queued = false;
    const r = film.getBoundingClientRect();
    const vh = innerHeight;
    if (r.bottom < -vh || r.top > vh) return;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
    if (Math.abs(p - lastP) < 0.0002 && drawn) return;
    lastP = p;
    film.style.setProperty("--p", p.toFixed(4));
    film.style.setProperty("--e", Math.min(1, Math.max(0, (p - 0.9) / 0.1)).toFixed(3));
    draw(p);
    const f = frameAt(p), w = when(f);
    if (tick && w !== tickText) { tick.textContent = w; tickText = w; }
    yearLine?.style.setProperty("--y", Math.min(1, f / (FRAMES - 1)).toFixed(3));
    if ((f >= 53) !== night) { night = f >= 53; film.classList.toggle("night", night); }
    for (const b of beats) {
      const [a, z] = b.r;
      const o = Math.min(ease(Math.min(1, Math.max(0, (p - a) / fade + (a === 0 ? 1 : 0)))), ease(Math.min(1, Math.max(0, (z - p) / fade))));
      b.el.style.opacity = o.toFixed(3);
      b.el.style.transform = o >= 0.999 ? "none" : `translate3d(0,${((1 - o) * (p < a + fade ? 24 : -24)).toFixed(1)}px,0)`;
      b.el.style.pointerEvents = o > 0.5 ? "auto" : "none";
      b.el.style.visibility = o < 0.002 ? "hidden" : "visible";
    }
  };
  let queued = false;
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };

  if (reduce) return; // the CSS shows the poster and the headline; nothing moves
  if (useFrames) {
    size();
    addEventListener("resize", () => { size(); schedule(); });
    // the frames wait until the page has loaded or the reader scrolls, so the poster stays the first thing fetched
    let started = false;
    const go = () => { if (started) return; started = true; startLoading(); };
    addEventListener("scroll", go, { once: true, passive: true });
    if (document.readyState === "complete") setTimeout(go, 300); else addEventListener("load", () => setTimeout(go, 300), { once: true });
  }
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  update();
}

// ================================================================ reveals, parallax, counters
function motion() {
  if (reduce) return;
  root.classList.add("motion");
  const show = (el: Element) => (el as HTMLElement).classList.add("in");
  const clear = (el: HTMLElement) => { el.style.removeProperty("transform"); el.style.removeProperty("opacity"); show(el); };
  inView(".reveal", (el) => {
    animate(el, { opacity: [0, 1], transform: ["translateY(36px)", "translateY(0)"] }, { duration: 0.9, ease: EASE })
      .finished.then(() => clear(el as HTMLElement));
  }, { margin: "0px 0px -10% 0px" });
  inView(".reveal-kids", (el) => {
    const kids = [...el.children] as HTMLElement[];
    animate(kids, { opacity: [0, 1], transform: ["translateY(28px)", "translateY(0)"] }, { duration: 0.8, ease: EASE, delay: stagger(0.07) })
      .finished.then(() => kids.forEach(clear));
  }, { margin: "0px 0px -8% 0px" });
  // big pictures drift a little against the scroll
  $$(".parallax").forEach((fig) => {
    const img = $("img", fig);
    if (!img) return;
    scroll(animate(img, { transform: ["translateY(-3.5%) scale(1.08)", "translateY(3.5%) scale(1.08)"] }, { ease: "linear" }), { target: fig, offset: ["start end", "end start"] });
  });
  // numbers count up once
  $$("[data-count]").forEach((el) => {
    const to = +el.dataset.count!, fmt = new Intl.NumberFormat(root.lang);
    inView(el, () => { animate(0, to, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { el.textContent = fmt.format(Math.round(v)); } }); }, { amount: 0.6 });
  });
}

// ================================================================ loops play only while they can be seen
function loops() {
  const vids = $$<HTMLVideoElement>("video[data-loop]");
  // posters wait until a loop comes near, so they never compete with the film's first frame
  const poster = (v: HTMLVideoElement) => { if (v.dataset.poster && !v.poster) v.poster = v.dataset.poster; };
  if (!("IntersectionObserver" in window)) { vids.forEach(poster); return; }
  if (reduce) {
    const p = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { poster(e.target as HTMLVideoElement); p.unobserve(e.target); } }), { rootMargin: "600px 0px" });
    vids.forEach((v) => p.observe(v));
    return;
  }
  const near = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const v = e.target as HTMLVideoElement; poster(v); v.preload = "auto"; near.unobserve(v); } }), { rootMargin: "600px 0px" });
  const seen = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target as HTMLVideoElement;
    if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
  }), { threshold: 0.2 });
  vids.forEach((v) => { near.observe(v); seen.observe(v); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) vids.forEach((v) => v.pause()); });
}

// ================================================================ the lightbox: fades in and out over the page
const openBox = (d: HTMLDialogElement) => {
  if (d.open) return;
  lockScroll();
  d.showModal();
};
const closeBox = (d: HTMLDialogElement) => {
  if (!d.open || d.classList.contains("closing")) return;
  d.classList.add("closing");
  setTimeout(() => { d.classList.remove("closing"); d.close(); unlockScroll(); }, reduce ? 0 : 250);
};

// ================================================================ the gallery and its lightbox
function gallery() {
  const box = $<HTMLDialogElement>("#lightbox");
  const shots = $$<HTMLButtonElement>("[data-shot]");
  if (!box || !shots.length) return;
  const img = $<HTMLImageElement>(".stage img", box)!, cap = $(".cap p", box)!, count = $(".cap span", box)!;
  const of = count.dataset.of ?? "of";
  let at = 0;
  const preload = (i: number) => { const s = shots[(i + shots.length) % shots.length]; const im = new Image(); im.src = s.dataset.full!; };
  const show = (i: number) => {
    at = (i + shots.length) % shots.length;
    const s = shots[at], thumb = $<HTMLImageElement>("img", s)!;
    img.src = thumb.currentSrc || thumb.src; // the small one at once, the large one when it has arrived
    const full = new Image();
    full.src = s.dataset.full!;
    full.decode().then(() => { if (at === shots.indexOf(s)) img.src = full.src; }).catch(() => {});
    img.alt = thumb.alt;
    cap.textContent = thumb.alt;
    count.textContent = `${at + 1} ${of} ${shots.length}`;
    preload(at + 1); preload(at - 1);
  };
  shots.forEach((s, i) => s.addEventListener("click", () => { show(i); openBox(box); }));
  box.addEventListener("click", (e) => { if ((e.target as Element).closest("[data-close]")) closeBox(box); });
  box.addEventListener("cancel", (e) => { e.preventDefault(); closeBox(box); });
  $$<HTMLButtonElement>(".nav", box).forEach((b) => b.addEventListener("click", () => show(at + +b.dataset.step!)));
  box.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") show(at + 1); else if (e.key === "ArrowLeft") show(at - 1); });
  const stage = $(".stage", box)!;
  let g: { x: number; y: number; axis: "" | "x" | "y" } | null = null;
  stage.addEventListener("pointerdown", (e) => { if ((e.target as Element).closest("button")) return; g = { x: e.clientX, y: e.clientY, axis: "" }; stage.setPointerCapture(e.pointerId); img.classList.add("dragging"); });
  stage.addEventListener("pointermove", (e) => {
    if (!g) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.axis && Math.hypot(dx, dy) > 8) g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (g.axis === "x") img.style.transform = `translate3d(${dx}px,0,0)`;
    else if (g.axis === "y" && dy > 0) { img.style.transform = `translate3d(0,${dy}px,0) scale(${1 - Math.min(0.15, dy / 2000)})`; box.style.opacity = String(1 - Math.min(0.6, dy / 500)); }
  });
  const end = (e: PointerEvent, cancel = false) => {
    if (!g) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y, { axis } = g;
    g = null;
    img.classList.remove("dragging");
    img.style.transform = ""; box.style.opacity = "";
    if (cancel) return;
    if (axis === "x" && Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
    else if (axis === "y" && dy > 100) closeBox(box);
    else if (!axis && e.pointerType !== "mouse" && e.target === stage) closeBox(box);
  };
  stage.addEventListener("pointerup", (e) => end(e));
  stage.addEventListener("pointercancel", (e) => end(e, true));
}

// ================================================================ the story: tap through the lines; Rive when near
function story() {
  const talk = $("[data-talk]");
  if (!talk) return;
  const lines = $$("ol.script li", talk);
  const who: Record<string, string> = JSON.parse(talk.dataset.who ?? "{}");
  const btn = $<HTMLButtonElement>(".line", talk)!;
  const whoEl = $(".who", btn)!, said = $(".said", btn)!, nextEl = $(".next", btn)!;
  const faces = { v: $(".face.v", talk)!, w: $(".face.w", talk)! };
  const lang = talk.dataset.lang ?? "en";
  let i = 0;
  let cast: { speak(k: "v" | "w", text: string, mood?: string, light?: boolean): void } | null = null;
  const show = (first = false) => {
    const li = lines[i], k = li.className as "v" | "w";
    const text = li.lastChild?.textContent?.trim() ?? "";
    btn.className = "line " + k;
    whoEl.textContent = who[k];
    said.textContent = text;
    if (!first) { said.classList.remove("swap"); void said.offsetWidth; said.classList.add("swap"); }
    faces.v.classList.toggle("on", k === "v");
    faces.w.classList.toggle("on", k === "w");
    nextEl.textContent = i === lines.length - 1 ? talk.dataset.again! : `${talk.dataset.tap} · ${i + 1}/${lines.length}`;
    if (!first) cast?.speak(k, text, li.dataset.mood, li.dataset.light === "1");
  };
  btn.hidden = false;
  talk.classList.add("live");
  btn.addEventListener("click", () => { i = (i + 1) % lines.length; show(); });
  show(true);
  if (reduce || saveData) return; // the stills stay
  let started = false;
  inView(talk, () => {
    if (started) return;
    started = true;
    import("./characters").then(({ mountCast }) => mountCast(talk, lang)).then((c) => {
      cast = c;
      // the first line is spoken once she is in view
      inView(talk, () => { const li = lines[i]; cast?.speak(li.className as "v" | "w", li.lastChild?.textContent?.trim() ?? "", li.dataset.mood, li.dataset.light === "1"); }, { amount: 0.5 });
    }).catch(() => { /* the stills stay */ });
  }, { margin: "600px 0px" });
}

// ================================================================ the release line, the night counter
function release() {
  $$("[data-release]").forEach((el) => { if (new Date() >= new Date(el.dataset.release + "T00:00:00")) el.textContent = el.dataset.after ?? el.textContent; });
}

function clock() {
  const c = $<HTMLButtonElement>(".clock"), dawn = $(".dawnend");
  if (!c || !dawn) return;
  const arc = $<SVGCircleElement>(".arc", c)!, label = $("span", c)!, full = 56.55;
  const night = c.dataset.night ?? "Night", dawnWord = c.dataset.dawn ?? "Dawn";
  let shown = "", on = false, isDawn = false, queued = false;
  const update = () => {
    queued = false;
    const start = innerHeight * 0.6;
    const end = Math.min(dawn.offsetTop - innerHeight * 0.4, root.scrollHeight - innerHeight - 4);
    const p = Math.min(1, Math.max(0, (scrollY - start) / (end - start)));
    if ((scrollY > start * 0.6) !== on) { on = !on; c.classList.toggle("on", on); }
    const atDawn = scrollY >= end;
    const text = atDawn ? dawnWord : `${night} ${Math.min(12, 1 + Math.floor(p * 12))}`;
    if (text !== shown) { label.textContent = text; shown = text; }
    if (atDawn !== isDawn) { isDawn = atDawn; c.classList.toggle("dawn", atDawn); }
    arc.style.strokeDashoffset = (full * (1 - p)).toFixed(2);
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  update();
  c.addEventListener("click", () => {
    const parts = $$("main > section, main > .wrap");
    const nxt = parts.find((el) => el.getBoundingClientRect().top > 24);
    if (nxt) scrollTo({ top: scrollY + nxt.getBoundingClientRect().top - 8, behavior: reduce ? "auto" : "smooth" });
  });
}

film();
motion();
loops();
sheets(reduce);
gallery();
story();
release();
clock();
