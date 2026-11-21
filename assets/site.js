// playwardlight.com: the light over the hero, the day/night slider, the night counter, the release line.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The hero: only what the light reaches can be seen. It follows the pointer or a finger, and drifts when left alone.
  const hero = document.querySelector("[data-light]");
  if (hero) {
    let tx = 62, ty = 46, x = tx, y = ty, idle = 0, last = performance.now(), visible = true;
    const set = (cx, cy) => {
      const r = hero.getBoundingClientRect();
      tx = ((cx - r.left) / r.width) * 100;
      ty = ((cy - r.top) / r.height) * 100;
      idle = 0;
    };
    hero.addEventListener("pointermove", (e) => set(e.clientX, e.clientY));
    hero.addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t) set(t.clientX, t.clientY); }, { passive: true });
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
