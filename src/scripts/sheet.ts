// The detail views (components/Sheet.astro). One controller per dialog:
//  · opening: the panel grows out of the element that was tapped. Its box is interpolated from that element's rect to
//    its own; the content keeps its layout and is only scaled uniformly (translate + scale) and clipped to the growing
//    box, so it is in place from the first frame. Springs (Motion) drive t (0 = at the origin, 1 = open) and dy (the
//    drag offset); every frame writes transform, clip-path and opacity, nothing else.
//  · drag: down from anywhere while the page is scrolled to its top, or from the panel's top at any time. 1:1 down,
//    rubber band up; let go past a threshold or fast enough and it flies back into its origin, otherwise it springs back.
//  · pages: a native scroll-snap row (iOS momentum as is); the light path is the indicator, arrow keys page on desktop.
//  · Esc, the close button and a tap on the dimmed page close it; showModal() keeps focus inside; the page behind
//    does not scroll and does not shift.
import { animate } from "motion";

type Box = { l: number; t: number; w: number; h: number; r: number };
type Anim = { stop(): void };
const OPEN = { type: "spring" as const, visualDuration: 0.5, bounce: 0.12 };
const CLOSE = { type: "spring" as const, visualDuration: 0.38, bounce: 0 };
const BACK = { type: "spring" as const, visualDuration: 0.35, bounce: 0.2 };
const RADIUS = 24;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const root = document.documentElement;
let locks = 0;
export const lockScroll = () => {
  if (locks++ > 0) return;
  root.style.setProperty("--sbw", `${Math.max(0, innerWidth - root.clientWidth)}px`);
  root.classList.add("sheet-open");
};
export const unlockScroll = () => {
  if (--locks > 0) return;
  locks = 0;
  root.classList.remove("sheet-open");
  root.style.removeProperty("--sbw");
};

class SheetView {
  d: HTMLDialogElement;
  panel: HTMLElement;
  scrim: HTMLElement;
  pager: HTMLElement;
  pages: HTMLElement[];
  nodes: HTMLButtonElement[];
  path: HTMLElement | null;
  reduce: boolean;
  t = 0;
  dy = 0;
  P: Box = { l: 0, t: 0, w: 1, h: 1, r: RADIUS };
  vh = 1; // the panel's visible height (to the dialog's bottom edge)
  O: Box = { l: 0, t: 0, w: 1, h: 1, r: RADIUS };
  state: "closed" | "opening" | "open" | "closing" = "closed";
  opener: HTMLElement | null = null;
  index = 0;
  target: number | null = null; // where a key or a tap on the path is taking the pager
  anims: Partial<Record<"t" | "dy", Anim>> = {};

  constructor(d: HTMLDialogElement, reduce: boolean) {
    this.d = d;
    this.reduce = reduce;
    this.panel = d.querySelector(".panel")!;
    this.scrim = d.querySelector(".scrim")!;
    this.pager = d.querySelector(".pager")!;
    this.pages = [...d.querySelectorAll<HTMLElement>(".leaf")];
    this.nodes = [...d.querySelectorAll<HTMLButtonElement>("[data-go]")];
    this.path = d.querySelector(".path");
    d.addEventListener("click", (e) => { if ((e.target as Element).closest("[data-close]")) this.close(); });
    d.addEventListener("cancel", (e) => { e.preventDefault(); this.close(); });
    d.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); this.go((this.target ?? this.index) + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); this.go((this.target ?? this.index) - 1); }
    });
    this.nodes.forEach((b) => b.addEventListener("click", () => this.go(+b.dataset.go!)));
    let queued = false;
    this.pager.addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; this.track(); });
    }, { passive: true });
    addEventListener("resize", () => { if (this.state === "open") { this.measure(); this.render(); this.pager.scrollLeft = this.index * this.pager.clientWidth; } });
    this.gestures();
  }

  // ------------------------------------------------------------ geometry
  measure() {
    const s = this.panel.style;
    const keep = [s.transform, s.clipPath];
    s.transform = "none"; s.clipPath = "none";
    const r = this.panel.getBoundingClientRect();
    s.transform = keep[0]; s.clipPath = keep[1];
    this.P = { l: r.left, t: r.top, w: r.width, h: r.height, r: RADIUS };
    this.vh = Math.max(1, Math.min(r.height, this.d.clientHeight - r.top));
  }
  // the rect the panel grows from / returns to: the element if it is on screen, else the bottom edge (a plain slide)
  originFrom(el: HTMLElement | null): Box {
    if (el && el.isConnected) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) {
        const cs = getComputedStyle(el);
        return { l: r.left, t: r.top, w: r.width, h: r.height, r: Math.min(parseFloat(cs.borderTopLeftRadius) || 0, r.height / 2) };
      }
    }
    return { l: this.P.l, t: this.d.clientHeight + 8, w: this.P.w, h: this.vh, r: RADIUS };
  }
  render() {
    const { t, P, O } = this;
    const l = O.l + (P.l - O.l) * t, top = O.t + (P.t - O.t) * t;
    const w = O.w + (P.w - O.w) * t, h = O.h + (this.vh - O.h) * t;
    const sc = Math.max(0.05, w / P.w);
    const ps = this.panel.style;
    ps.transform = `translate3d(${(l - P.l).toFixed(2)}px,${(top - P.t + this.dy).toFixed(2)}px,0) scale(${sc.toFixed(5)})`;
    if (t >= 1) ps.clipPath = "none";
    else {
      const rt = (O.r + (RADIUS - O.r) * clamp(t)) / sc, rb = (O.r * (1 - clamp(t))) / sc;
      const cut = Math.max(0, P.h - h / sc);
      ps.clipPath = `inset(0px 0px ${cut.toFixed(2)}px 0px round ${rt.toFixed(2)}px ${rt.toFixed(2)}px ${rb.toFixed(2)}px ${rb.toFixed(2)}px)`;
    }
    ps.opacity = clamp(t / 0.16).toFixed(3);
    this.scrim.style.opacity = (clamp(t) * (1 - 0.85 * clamp(this.dy / this.vh))).toFixed(3);
  }
  spring(key: "t" | "dy", to: number, opts: object, velocity = 0, done?: () => void) {
    this.anims[key]?.stop();
    this.anims[key] = animate(this[key], to, {
      ...opts, velocity, ...(key === "t" ? { restDelta: 0.002, restSpeed: 0.03 } : { restDelta: 0.3 }),
      onUpdate: (v: number) => { this[key] = v; this.render(); },
      onComplete: () => { this[key] = to; this.render(); done?.(); },
    }) as unknown as Anim;
  }
  stopAll() { this.anims.t?.stop(); this.anims.dy?.stop(); this.anims = {}; }

  // ------------------------------------------------------------ open / close
  open(from: HTMLElement | null, page = 0) {
    if (this.d.open) return;
    this.stopAll();
    this.opener = from;
    lockScroll();
    this.d.showModal();
    this.state = "opening";
    // land on the page at once (no smooth scroll), every page at its top
    this.pages.forEach((p) => { p.scrollTop = 0; });
    this.pager.scrollLeft = clamp(page, 0, this.pages.length - 1) * this.pager.clientWidth;
    this.track(true);
    this.measure();
    this.O = this.originFrom(from);
    this.pager.focus({ preventScroll: true });
    if (this.reduce) { this.t = 1; this.dy = 0; this.fade(0, 1, () => { this.state = "open"; }); return; }
    this.t = 0; this.dy = 0; this.render();
    this.spring("t", 1, OPEN, 0, () => { this.state = "open"; });
  }
  close(velocity = 0) {
    if (!this.d.open || this.state === "closing") return;
    this.state = "closing";
    this.stopAll();
    this.measure();
    // back into the element for the page now shown, if it is on screen; else into the one that opened it
    const own = document.querySelector<HTMLElement>(`[data-open="${this.d.id}"][data-page="${this.index}"]`);
    const onScreen = (el: HTMLElement | null) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; };
    this.O = this.originFrom(onScreen(own) ? own : this.opener);
    if (this.reduce) { this.fade(1, 0, () => this.finish()); return; }
    this.spring("dy", 0, CLOSE, velocity);
    this.spring("t", 0, CLOSE, 0, () => this.finish());
    // a backgrounded tab may never deliver the spring's last frame: close anyway
    setTimeout(() => { if (this.state === "closing") this.finish(); }, 1200);
  }
  finish() {
    if (this.state === "closed") return;
    this.stopAll();
    this.state = "closed";
    this.d.close();
    unlockScroll();
    for (const el of [this.panel, this.scrim]) { el.style.removeProperty("transform"); el.style.removeProperty("clip-path"); el.style.removeProperty("opacity"); }
    this.pages.forEach((p) => p.querySelectorAll("video").forEach((v) => v.pause()));
    this.opener?.focus({ preventScroll: true });
  }
  fade(from: number, to: number, done: () => void) {
    this.panel.style.transform = `translate3d(0,${this.dy.toFixed(1)}px,0)`;
    this.panel.style.clipPath = "none";
    animate(from, to, { duration: 0.2, ease: "linear", onUpdate: (v: number) => { this.panel.style.opacity = String(v); this.scrim.style.opacity = String(v); }, onComplete: done });
  }

  // ------------------------------------------------------------ pages
  go(i: number) {
    const n = this.pages.length;
    if (n < 2) return;
    const to = clamp(i, 0, n - 1);
    this.target = to;
    this.pager.scrollTo({ left: to * this.pager.clientWidth, behavior: this.reduce ? "auto" : "smooth" });
  }
  track(force = false) {
    const n = this.pages.length;
    const w = Math.max(1, this.pager.clientWidth);
    const p = clamp(this.pager.scrollLeft / w, 0, n - 1);
    this.path?.style.setProperty("--p", n > 1 ? (p / (n - 1)).toFixed(4) : "0");
    if (this.target !== null && Math.abs(p - this.target) < 0.01) this.target = null;
    const i = Math.round(p);
    if (i === this.index && !force) return;
    this.index = i;
    this.nodes.forEach((b, j) => b.setAttribute("aria-current", String(j === i)));
  }
  current() { return this.pages[this.index] ?? this.pages[0]; }

  // ------------------------------------------------------------ the drag
  gestures() {
    const top = this.d.querySelector<HTMLElement>(".sheet-top")!;
    const rubber = (x: number) => (1 - 1 / ((x * 0.55) / 60 + 1)) * 60; // up: at most ~60 px, less than the panel's overhang
    type G = { y0: number; x0: number; base: number; mode: "" | "drag" | "native"; head: boolean; samples: [number, number][] };
    let g: G | null = null;
    const startDrag = (y: number) => {
      this.stopAll();
      this.state = "open";
      this.t = 1;
      g!.mode = "drag";
      g!.base = this.dy; // y0 stays where the finger came down: the panel is under the finger from the first move
      g!.samples.push([performance.now(), y]);
    };
    const moveTo = (y: number) => {
      const raw = g!.base + (y - g!.y0);
      this.dy = raw >= 0 ? raw : -rubber(-raw);
      g!.samples.push([performance.now(), y]);
      if (g!.samples.length > 6) g!.samples.shift();
      this.render();
    };
    const release = () => {
      const s = g!.samples;
      let v = 0;
      if (s.length > 1) {
        const [ta, ya] = s[0], [tb, yb] = s[s.length - 1];
        if (performance.now() - tb < 80 && tb > ta) v = ((yb - ya) / (tb - ta)) * 1000;
      }
      g = null;
      if ((this.dy > Math.min(150, this.vh * 0.22) && v > -200) || (v > 700 && this.dy > 12)) this.close(v);
      else this.spring("dy", 0, BACK, v, () => { if (this.state === "open") this.render(); });
    };
    const begin = (x: number, y: number, target: EventTarget | null) => {
      if (this.state !== "open" && !(this.state === "opening" && this.t > 0.95)) return false;
      g = { x0: x, y0: y, base: this.dy, mode: "", head: !!(target as Element)?.closest?.(".sheet-top"), samples: [[performance.now(), y]] };
      return true;
    };

    // touch: decide on the first moves; once it is ours, the page does not scroll (preventDefault)
    this.panel.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1 || (e.target as Element).closest("button.x")) { g = null; return; }
      const p = e.touches[0];
      begin(p.clientX, p.clientY, e.target);
    }, { passive: true });
    this.panel.addEventListener("touchmove", (e) => {
      if (!g) return;
      const p = e.touches[0];
      if (!g.mode) {
        const dx = p.clientX - g.x0, dy = p.clientY - g.y0;
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
        const vertical = Math.abs(dy) > Math.abs(dx);
        const atTop = this.current().scrollTop <= 0;
        if (vertical && (g.head || (dy > 0 && atTop))) startDrag(p.clientY);
        else { g.mode = "native"; return; }
      }
      if (g.mode !== "drag") return;
      if (e.cancelable) e.preventDefault();
      moveTo(p.clientY);
    }, { passive: false });
    const end = () => { if (g?.mode === "drag") release(); else g = null; };
    this.panel.addEventListener("touchend", end);
    this.panel.addEventListener("touchcancel", end);
    this.scrim.addEventListener("touchmove", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });

    // mouse and pen: from the top of the panel
    top.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" || e.button !== 0 || (e.target as Element).closest("button")) return;
      if (!begin(e.clientX, e.clientY, e.target)) return;
      top.setPointerCapture(e.pointerId);
      startDrag(e.clientY);
    });
    top.addEventListener("pointermove", (e) => { if (g?.mode === "drag" && e.pointerType !== "touch") moveTo(e.clientY); });
    const up = (e: PointerEvent) => { if (g?.mode === "drag" && e.pointerType !== "touch") release(); };
    top.addEventListener("pointerup", up);
    top.addEventListener("pointercancel", up);
  }
}

export function sheets(reduce: boolean) {
  const views = new Map<string, SheetView>();
  document.querySelectorAll<HTMLDialogElement>("dialog[data-sheet]").forEach((d) => views.set(d.id, new SheetView(d, reduce)));
  document.querySelectorAll<HTMLElement>("[data-open]").forEach((b) =>
    b.addEventListener("click", () => views.get(b.dataset.open!)?.open(b, +(b.dataset.page ?? 0))));
  // for checks (tools/check-sheets.mjs)
  (window as unknown as { __sheets: Map<string, SheetView> }).__sheets = views;
}
