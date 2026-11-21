// playwardlight.com: the light over the hero, the day/night slider, the night counter, the release line.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The hero: only what the light reaches can be seen. It follows the pointer or a finger, and drifts when left alone.
  // On a narrow screen the village is wider than the phone: a sideways swipe pans it. Glowing spots on the map open a
  // one-line card about what is there.
  const hero = document.querySelector("[data-light]");
  if (hero) {
    let tx = 62, ty = 46, x = tx, y = ty, idle = 0, last = performance.now(), visible = true;
    const plate = hero.querySelector(".plate.lit");
    const set = (cx, cy) => {
      const r = plate.getBoundingClientRect();
      tx = ((cx - r.left) / r.width) * 100;
      ty = ((cy - r.top) / r.height) * 100;
      idle = 0;
    };
    hero.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") set(e.clientX, e.clientY); });

    // The map: where an image point lands in the hero, with object-fit: cover and the current pan.
    const img = hero.querySelector(".plate.lit img"), ar = 2600 / 1219;
    const spots = [...hero.querySelectorAll(".spot")], copy = hero.querySelector(".copy");
    const card = hero.querySelector(".card"), texts = [...hero.querySelector("#spot-text").content.querySelectorAll("p")].map((p) => p.textContent.split("|"));
    const narrow = matchMedia("(max-width: 760px)");
    let px = null, open = -1;
    const geo = () => {
      const w = plate.clientWidth, h = plate.clientHeight;
      const cs = getComputedStyle(hero);
      const fx = px ?? parseFloat(cs.getPropertyValue("--px") || "58") / 100, fy = parseFloat(cs.getPropertyValue("--py") || "50") / 100;
      let rw = w, rh = w / ar; if (rh < h) { rh = h; rw = h * ar; }
      return { w, h, rw, rh, ox: (w - rw) * fx, oy: (h - rh) * fy };
    };
    const place = () => {
      const g = geo(), h1 = copy.querySelector("h1"), limit = copy.offsetTop + h1.offsetTop - 16;
      const textRight = narrow.matches ? Infinity : copy.offsetLeft + h1.offsetLeft + h1.offsetWidth + 30;
      spots.forEach((s, i) => {
        const sx = g.ox + (s.dataset.x / 100) * g.rw, sy = g.oy + (s.dataset.y / 100) * g.rh;
        s.style.setProperty("--sx", sx + "px"); s.style.setProperty("--sy", sy + "px");
        s.hidden = sx < 18 || sx > g.w - 18 || sy < 70 || sy > g.h - 30 || (sy > limit && sx < textRight);
        s._p = [sx, sy];
        if (i === open && s.hidden) close();
      });
      if (open >= 0) aim();
    };
    const aim = () => {
      const [sx, sy] = spots[open]._p, w = hero.clientWidth, cw = card.offsetWidth, ch = card.offsetHeight;
      let cx = sx > w / 2 ? sx - cw - 26 : sx + 26, cy = sy - ch / 2;
      if (cx < 12 || cx + cw > w - 12) { cx = Math.min(Math.max(12, sx - cw / 2), w - cw - 12); cy = sy + 30; }
      cy = Math.max(70, cy);
      card.style.setProperty("--cx", cx + "px"); card.style.setProperty("--cy", cy + "px");
    };
    const close = () => { if (open >= 0) spots[open].setAttribute("aria-expanded", "false"); open = -1; card.hidden = true; };
    spots.forEach((s, i) => s.addEventListener("click", (e) => {
      e.stopPropagation();
      if (open === i) return close();
      close(); open = i; s.setAttribute("aria-expanded", "true");
      card.querySelector("b").textContent = texts[i][0]; card.querySelector("span").textContent = texts[i][1];
      card.classList.toggle("blight", s.classList.contains("blight"));
      card.hidden = false; aim();
      const r = hero.getBoundingClientRect(); set(r.left + s._p[0], r.top + s._p[1]); idle = -6000;
    }));
    hero.addEventListener("click", (e) => { if (!card.contains(e.target)) close(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    // A sideways swipe pans the village on a phone; a finger also carries the light.
    let drag = null;
    hero.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      const g = geo(); glide = null;
      drag = { x: e.clientX, px: px ?? g.ox / Math.min(-1, g.w - g.rw) };
    });
    hero.addEventListener("pointermove", (e) => {
      if (!drag) return;
      set(e.clientX, e.clientY);
      const g = geo(), span = g.rw - g.w;
      if (narrow.matches && span > 4) {
        px = Math.min(1, Math.max(0, drag.px - (e.clientX - drag.x) / span));
        hero.style.setProperty("--px", (px * 100).toFixed(2) + "%");
        place();
      }
    });
    const end = () => { drag = null; };
    hero.addEventListener("pointerup", end); hero.addEventListener("pointercancel", end);
    // On a phone, glide once toward the Mist and back, so it is plain the village goes on past the edge.
    let glide = null;
    if (narrow.matches && !reduce) setTimeout(() => {
      if (drag || px !== null) return;
      const t0 = performance.now(), from = 0.64, to = 0.22;
      glide = (now) => {
        if (!glide) return;
        const p = Math.min(1, (now - t0) / 3600), e = (1 - Math.cos(p * Math.PI * 2)) / 2;
        px = from + (to - from) * e;
        hero.style.setProperty("--px", (px * 100).toFixed(2) + "%"); place();
        if (p < 1) requestAnimationFrame(glide); else glide = null;
      };
      requestAnimationFrame(glide);
    }, 900);
    if (img.complete) place(); else img.addEventListener("load", place);
    addEventListener("resize", () => { px = null; hero.style.removeProperty("--px"); place(); });
    narrow.addEventListener("change", place);
    place();

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(tick); }).observe(hero);
    function tick(now) {
      const dt = Math.min(64, now - last); last = now; idle += dt;
      if (idle > 2600 && !reduce) {           // drift in a slow figure of eight when nobody holds the light
        const t = now / 5200;
        tx = 60 + Math.sin(t) * 16; ty = 48 + Math.sin(t * 2) * 9;
      }
      const k = reduce ? 1 : 1 - Math.pow(0.0025, dt / 1000);
      x += (tx - x) * k; y += (ty - y) * k;
      hero.style.setProperty("--lx", x.toFixed(2) + "%");
      hero.style.setProperty("--ly", y.toFixed(2) + "%");
      if (visible && !reduce) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

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
