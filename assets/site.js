// playwardlight.com: the light over the hero, the day/night slider, the night counter, the release line.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Scroll scenes: each [data-film]/[data-scene] section is taller than the screen and its .pin sticks; the section's
  // progress through the screen (0 when its top reaches the top, 1 when its bottom reaches the bottom) goes to --p.
  const scenes = [...document.querySelectorAll("[data-film], [data-scene]")];
  const film = document.querySelector("[data-film]");
  const tint = document.querySelector(".tint"), tintNames = tint ? [...tint.querySelectorAll(".names li")] : [], tintVids = tint ? [...tint.querySelectorAll("video")] : [];
  const beats = film ? [...film.querySelectorAll("[data-beat]")].map((el) => ({ el, r: el.dataset.beat.split(" ").map(Number) })) : [];
  const ease = (t) => t * t * (3 - 2 * t);
  const fade = 0.045;

  // The film's frames: drawn to a canvas, cover-fitted; a tall set for portrait screens, a wide one otherwise. Between
  // two frames the next is laid over the last by the fraction, so a stage change dissolves instead of cutting.
  let frames = [], canvas, ctx, drawn = "", want = () => {};
  if (film && +film.dataset.frames > 0 && !reduce) {
    const n = +film.dataset.frames, tall = innerWidth / innerHeight < 1;
    const path = tall ? film.dataset.tall : film.dataset.wide;
    canvas = film.querySelector("canvas"); ctx = canvas.getContext("2d");
    want = (i) => { if (!frames[i]) { const im = load(i); frames[i] = im; im.onload = () => { drawn = ""; onScroll(); }; } };
    const load = (i) => { const im = new Image(); im.decoding = "async"; im.src = path + String(i + 1).padStart(3, "0") + ".webp"; return im; };
    frames = new Array(n);
    // the first frames first, then every 8th, 4th, 2nd and the rest, so a fast scroll always has something near
    const order = []; const seen = new Set();
    for (const step of [1e9, 8, 4, 2, 1]) for (let i = 0; i < n; i += Math.min(step, n)) if (!seen.has(i)) { seen.add(i); order.push(i); }
    let k = 0; const next = () => { const batch = order.slice(k, k + 6); k += 6; let left = batch.length; if (!left) return;
      batch.forEach((i) => { if (frames[i]) { if (--left === 0) next(); return; } const im = load(i); frames[i] = im; const done = () => { if (--left === 0) next(); if (i === 0) film.classList.add("has-frames"); drawn = ""; onScroll(); }; im.onload = done; im.onerror = done; }); };
    next();
    const size = () => { const r = Math.min(2, devicePixelRatio || 1); canvas.width = canvas.clientWidth * r; canvas.height = canvas.clientHeight * r; drawn = ""; };
    addEventListener("resize", size); size();
  }
  const ready = (i) => frames[i] && frames[i].complete && frames[i].naturalWidth;
  const paint = (im, alpha) => {
    const cw = canvas.width, ch = canvas.height, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.globalAlpha = alpha; ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h); ctx.globalAlpha = 1;
  };
  const draw = (p) => {
    if (!frames.length) return;
    // the scroll's place → a frame: the bare heart while "Day one" reads, the growth under "You build only…", winter
    // under "By winter", and the night's frames under "Then night comes" (knots fit the 105-frame take)
    const knots = [[0, 0], [0.18, 0], [0.36, 9], [0.58, 39], [0.76, 50], [1, frames.length - 1]];
    let f = 0;
    for (let j = 1; j < knots.length; j++) if (p <= knots[j][0]) { const [p0, f0] = knots[j - 1], [p1, f1] = knots[j]; f = f0 + (f1 - f0) * ((p - p0) / Math.max(1e-6, p1 - p0)); break; }
    let a = Math.floor(f), b = Math.min(frames.length - 1, a + 1), t = f - a;
    want(a); want(b);
    let up = a; while (up < frames.length - 1 && !ready(up) && up - a < 6) up++;
    while (a > 0 && !ready(a)) a--;
    if (ready(up) && Math.abs(up - f) < Math.abs(a - f)) { a = up; t = 0; }
    if (!ready(a)) return;
    if (!ready(b)) { b = a; t = 0; }
    const key = a + ":" + b + ":" + t.toFixed(2);
    if (key === drawn) return;
    paint(frames[a], 1); if (t > 0.02 && b !== a) paint(frames[b], t); drawn = key;
  };

  // Loops play only while they can be seen.
  const vids = [...document.querySelectorAll("main video")].filter((v) => !v.closest(".tint, .tile, dialog"));
  if ("IntersectionObserver" in window) {
    const vo = new IntersectionObserver((es) => es.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting && !reduce) { if (v.preload === "none") v.preload = "auto"; v.play().catch(() => {}); } else v.pause();
    }), { rootMargin: "200px 0px" });
    vids.forEach((v) => vo.observe(v));
  }

  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = innerHeight;
    for (const sc of scenes) {
      const r = sc.getBoundingClientRect();
      if (r.bottom < -vh || r.top > 2 * vh) continue;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      sc.style.setProperty("--p", p.toFixed(4));
      if (sc === film) {
        draw(p);
        for (const b of beats) {
          const [a, z] = b.r;
          const o = Math.min(ease(Math.min(1, Math.max(0, (p - a) / fade + (a === 0 ? 1 : 0)))), ease(Math.min(1, Math.max(0, (z - p) / fade))));
          b.el.style.opacity = o.toFixed(3);
          b.el.style.transform = "translateY(" + ((1 - o) * (p < a + fade ? 24 : -24)).toFixed(1) + "px)";
          b.el.style.pointerEvents = o > 0.5 ? "auto" : "none";
        }
      }
      if (sc === tint) {
        const on = p < 0.36 ? 0 : p < 0.68 ? 1 : 2;
        sc.style.setProperty("--b", Math.min(1, Math.max(0, (p - 0.26) / 0.14)).toFixed(3));
        sc.style.setProperty("--c", Math.min(1, Math.max(0, (p - 0.58) / 0.14)).toFixed(3));
        tintNames.forEach((li, j) => li.classList.toggle("on", j === on));
        const live = r.top < vh && r.bottom > 0;
        tintVids.forEach((v, j) => { if (live && j === on) { if (v.preload === "none") v.preload = "auto"; if (v.paused) v.play().catch(() => {}); } else if (!v.paused) v.pause(); });
      }
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  if (!reduce) { addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll); update(); }
  else beats.forEach((b) => { b.el.style.opacity = 1; });

  // Sheets: "Explore …" opens a glass panel from below; its loops play only while it is open.
  const openSheet = (d, from) => {
    if (!d || d.open) return;
    const r = from ? (from.querySelector(".gem") || from).getBoundingClientRect() : null;
    d.style.setProperty("--ox", r ? (r.left + r.width / 2) + "px" : "50%");
    d.style.setProperty("--oy", r ? (r.top + r.height / 2) + "px" : "50%");
    d.showModal(); d.scrollTop = 0; document.documentElement.classList.add("sheet-open");
    d.querySelectorAll("video").forEach((v) => { v.preload = "auto"; v.play().catch(() => {}); });
  };
  const closeSheet = (d) => {
    if (!d.open || d.classList.contains("closing")) return;
    d.classList.add("closing");
    setTimeout(() => { d.classList.remove("closing"); d.close(); }, reduce ? 0 : 430);
  };
  document.querySelectorAll("dialog.sheet").forEach((d) => {
    d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) closeSheet(d); });
    d.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(d); });
    d.addEventListener("close", () => { document.documentElement.classList.remove("sheet-open"); d.querySelectorAll("video").forEach((v) => v.pause()); });
  });
  document.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => openSheet(document.getElementById(b.dataset.open), b)));

  // The land sheet: one land at a time from its template, tabs on top, previous and next below.
  const landSheet = document.getElementById("sheet-land");
  if (landSheet) {
    const tpls = [...landSheet.querySelectorAll("template[data-land-id]")];
    const names = tpls.map((t) => t.content.querySelector("h3").textContent);
    const body = landSheet.querySelector(".land-body"), tabs = [...landSheet.querySelectorAll("[data-go]")];
    const [prev, next] = landSheet.querySelectorAll("[data-step]");
    let at = 0;
    const show = (i) => {
      at = (i + tpls.length) % tpls.length;
      body.replaceChildren(tpls[at].content.cloneNode(true));
      body.style.animation = "none"; void body.offsetWidth; body.style.animation = "";
      tabs.forEach((t, j) => t.setAttribute("aria-current", String(j === at)));
      const bar = tabs[at].parentElement; bar.scrollLeft = tabs[at].offsetLeft - bar.clientWidth / 2 + tabs[at].offsetWidth / 2;
      prev.querySelector("span").textContent = names[(at - 1 + tpls.length) % tpls.length];
      next.querySelector("span").textContent = names[(at + 1) % tpls.length];
      landSheet.scrollTop = 0;
    };
    tabs.forEach((t) => t.addEventListener("click", () => show(+t.dataset.go)));
    prev.addEventListener("click", () => show(at - 1)); next.addEventListener("click", () => show(at + 1));
    document.querySelectorAll("[data-land]").forEach((b) => b.addEventListener("click", () => { show(+b.dataset.land); openSheet(landSheet, b); }));
  }

  // The element tiles: play on hover with a mouse; on a phone, the tile in view plays.
  const tiles = [...document.querySelectorAll(".tile")];
  const playTile = (t, on) => { const v = t.querySelector("video"); t.classList.toggle("on", on); if (on) { v.preload = "auto"; v.play().catch(() => {}); } else v.pause(); };
  tiles.forEach((t) => {
    t.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") playTile(t, true); });
    t.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") playTile(t, false); });
    t.addEventListener("click", () => playTile(t, !t.classList.contains("on")));
  });
  if ("IntersectionObserver" in window && matchMedia("(hover: none)").matches && !reduce) {
    const to = new IntersectionObserver((es) => es.forEach((e) => playTile(e.target, e.intersectionRatio > 0.7)), { threshold: [0, 0.7, 1] });
    tiles.forEach((t) => to.observe(t));
  }

  // Things that rise into place the first time they are seen.
  const risers = document.querySelectorAll(".rise");
  if ("IntersectionObserver" in window && !reduce) {
    const ro = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } }), { rootMargin: "0px 0px -12% 0px" });
    risers.forEach((r) => ro.observe(r));
  } else risers.forEach((r) => r.classList.add("in"));

  // Tabs over a picture: day and night, the seasons, the Attunements, the lands. One line of text for the chosen one.
  const tabs = (root, pick) => {
    const buttons = [...root.querySelectorAll('[role="tab"]')];
    const lines = [...root.querySelector("template").content.querySelectorAll("p")].map((p) => p.innerHTML);
    const say = root.querySelector(".say");
    const choose = (i, first) => {
      buttons.forEach((b, j) => b.setAttribute("aria-selected", String(i === j)));
      say.innerHTML = lines[i];
      if (!first) { say.classList.remove("swap"); void say.offsetWidth; say.classList.add("swap"); }
      pick(buttons[i], i);
    };
    buttons.forEach((b, i) => b.addEventListener("click", () => choose(i)));
    root.querySelector('[role="tablist"]').addEventListener("keydown", (e) => {
      const i = buttons.findIndex((b) => b.getAttribute("aria-selected") === "true");
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { const n = (i + d + buttons.length) % buttons.length; choose(n); buttons[n].focus(); }
    });
    choose(0, true);
  };
  document.querySelectorAll("[data-toggle]").forEach((root) => {
    const imgs = [...root.querySelectorAll(".stage img")];
    tabs(root, (_, i) => imgs.forEach((im, j) => im.classList.toggle("on", i === j)));
  });
  document.querySelectorAll("[data-slices]").forEach((root) => {
    tabs(root, (b) => {
      const clip = b.dataset.clip;
      root.classList.toggle("none", clip === "none");
      if (clip !== "none") root.style.setProperty("--clip", clip);
      root.style.setProperty("--pos", b.dataset.pos + "%");
    });
  });

  // The conversation: one line at a time, the speaker lit.
  document.querySelectorAll("[data-talk]").forEach((root) => {
    const lines = [...root.querySelector("template").content.querySelectorAll("p")];
    const btn = root.querySelector(".line"), who = btn.querySelector(".who"), said = btn.querySelector(".said"), next = btn.querySelector(".next");
    const faces = { v: root.querySelector(".face.v"), w: root.querySelector(".face.w") };
    let i = 0;
    const show = () => {
      const p = lines[i], k = p.className;
      btn.className = "line " + k;
      who.textContent = k === "v" ? "Vaelith" : "Lampwright";
      said.textContent = p.textContent;
      said.style.animation = "none"; void said.offsetWidth; said.style.animation = "";
      faces.v.classList.toggle("on", k === "v"); faces.w.classList.toggle("on", k === "w");
      next.textContent = i === lines.length - 1 ? "Again" : "Tap · " + (i + 1) + "/" + lines.length;
    };
    btn.addEventListener("click", () => { i = (i + 1) % lines.length; show(); });
    show();
  });

  // Numbers that count up the first time they are seen.
  const counters = document.querySelectorAll("[data-count]");
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, to = +el.dataset.count, t0 = performance.now(), fmt = new Intl.NumberFormat("en");
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 1400), v = Math.round(to * (1 - Math.pow(1 - p, 3)));
        el.textContent = fmt.format(v);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }), { threshold: .6 });
    counters.forEach((c) => io.observe(c));
  }

  // Day and night: one frame, a handle between them.
  document.querySelectorAll("[data-compare]").forEach((box) => {
    const input = box.querySelector("input");
    const apply = () => box.style.setProperty("--cut", input.value + "%");
    input.addEventListener("input", apply);
    apply();
  });

  // The release line changes itself on launch day.
  document.querySelectorAll("[data-release]").forEach((el) => {
    if (new Date() >= new Date(el.dataset.release + "T00:00:00")) el.textContent = el.dataset.after;
  });

  // The night counter: the page is one run. Night 1 at the top, dawn at the bottom.
  const clock = document.querySelector(".clock");
  const dawn = document.querySelector(".dawnend");
  if (clock && dawn) {
    const arc = clock.querySelector(".arc"), label = clock.querySelector("span"), full = 56.55;
    let shown = "";
    const update = () => {
      const start = innerHeight * 0.6;
      const end = Math.min(dawn.offsetTop - innerHeight * 0.4, document.documentElement.scrollHeight - innerHeight - 4);
      const p = Math.min(1, Math.max(0, (scrollY - start) / (end - start)));
      clock.classList.toggle("on", scrollY > start * 0.6);
      const atDawn = scrollY >= end;
      const text = atDawn ? "Dawn" : "Night " + Math.min(12, 1 + Math.floor(p * 12));
      if (text !== shown) { label.textContent = text; shown = text; }
      clock.classList.toggle("dawn", atDawn);
      arc.style.strokeDashoffset = (full * (1 - p)).toFixed(2);
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
  }
})();
