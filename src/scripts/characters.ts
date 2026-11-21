// The story's two figures, the game's own Rive files (App/Intro/vaelith.riv, dwarf-talking.riv; state machine
// "Character", fit contain, bottom centre), loaded only when the story section comes near. They breathe and blink by
// themselves; the mouth follows the view model's text property "Laut" through the line being shown, read by a small
// copy of the game's SpokenLine rules. Vaelith also has "Stimmung" (her face) and "Licht" (she flinches from light).
// If anything fails, the still pictures underneath stay.
import { Rive, Layout, Fit, Alignment, RuntimeLoader } from "@rive-app/canvas";
import wasmUrl from "@rive-app/canvas/rive.wasm?url";

RuntimeLoader.setWasmUrl(wasmUrl);

type Who = "v" | "w";
interface Figure { rive: Rive; frame: HTMLElement; timers: number[] }

// ---------------------------------------------------------------- a mouth for a text (SpokenLine, simplified)
const VOWEL = 0.115, CONSONANT = 0.075, HELD = 0.045, COMMA = 0.24, STOP = 0.42, SPACE = 0.03;
const vowels: Record<string, string> = { a: "ah", e: "eh", i: "ee", o: "oh", u: "oo", y: "ee", ä: "eh", ö: "uh", ü: "oo" };
const consonants: Record<string, string> = { b: "b", p: "p", m: "m", f: "f", v: "f", w: "w", s: "s", z: "z", c: "c", ß: "s", l: "l", n: "l", t: "l", d: "l", r: "r", j: "ee" };
function cues(text: string, lang: string) {
  const out: { sound: string; at: number }[] = [];
  const s = text.toLowerCase().replace(/[’']/g, "");
  let t = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], two = s.slice(i, i + 2), three = s.slice(i, i + 3);
    if (lang === "de" && three === "sch") { out.push({ sound: "sh", at: t }); t += CONSONANT; i += 2; continue; }
    if (two === "th" && lang !== "de") { out.push({ sound: "th", at: t }); t += CONSONANT; i++; continue; }
    if (two === "sh" || two === "ch") { out.push({ sound: two === "sh" ? "sh" : "ch", at: t }); t += CONSONANT; i++; continue; }
    if (two === "oo" || two === "ee") { out.push({ sound: two, at: t }); t += VOWEL * 1.4; i++; continue; }
    if (vowels[c]) { out.push({ sound: vowels[c], at: t }); t += VOWEL; continue; }
    if (consonants[c]) { out.push({ sound: consonants[c], at: t }); t += CONSONANT; continue; }
    if (/[.!?…]/.test(c)) { out.push({ sound: " ", at: t }); t += STOP; continue; }
    if (/[,;:—–]/.test(c)) { out.push({ sound: " ", at: t }); t += COMMA; continue; }
    if (/\s/.test(c)) { t += SPACE; continue; }
    if (/\p{L}/u.test(c)) t += HELD; // k, g, h: the mouth holds its shape
  }
  out.push({ sound: " ", at: t });
  return out;
}

function mount(frame: HTMLElement, onReady: () => void): Figure {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  frame.appendChild(canvas);
  const fig: Figure = { frame, timers: [], rive: null as unknown as Rive };
  fig.rive = new Rive({
    src: frame.dataset.rive!,
    canvas,
    artboard: frame.dataset.artboard,
    stateMachine: "Character",
    autoplay: true,
    autoBind: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.BottomCenter }),
    onLoad: () => {
      fig.rive.resizeDrawingSurfaceToCanvas();
      frame.classList.add("live");
      onReady();
    },
  });
  return fig;
}

export function mountCast(talk: HTMLElement, lang: string) {
  return new Promise<{ speak(k: Who, text: string, mood?: string, light?: boolean): void }>((resolve, reject) => {
    const frames = { v: talk.querySelector<HTMLElement>(".face.v .frame")!, w: talk.querySelector<HTMLElement>(".face.w .frame")! };
    let ready = 0;
    const done = () => { if (++ready === 2) resolve({ speak }); };
    let figs: Record<Who, Figure>;
    try {
      figs = { v: mount(frames.v, done), w: mount(frames.w, done) };
    } catch (e) { reject(e); return; }
    setTimeout(() => { if (ready < 2) reject(new Error("rive timeout")); }, 15000);

    const vm = (k: Who) => figs[k].rive.viewModelInstance;
    const setSound = (k: Who, s: string) => { const p = vm(k)?.string("Laut"); if (p && p.value !== s) p.value = s; };
    function speak(k: Who, text: string, mood?: string, light?: boolean) {
      for (const who of ["v", "w"] as Who[]) { figs[who].timers.forEach(clearTimeout); figs[who].timers = []; setSound(who, " "); }
      if (k === "v") {
        const m = vm("v")?.enum("Stimmung");
        if (m) m.value = mood ?? "kuehl";
        if (light) vm("v")?.trigger("Licht")?.trigger();
      }
      const f = figs[k];
      for (const c of cues(text, lang)) f.timers.push(window.setTimeout(() => setSound(k, c.sound), 250 + c.at * 1000));
    }

    // sharp on any screen; asleep while off screen
    const ro = new ResizeObserver(() => { figs.v.rive.resizeDrawingSurfaceToCanvas(); figs.w.rive.resizeDrawingSurfaceToCanvas(); });
    ro.observe(frames.v); ro.observe(frames.w);
    new IntersectionObserver((es) => es.forEach((e) => {
      for (const f of Object.values(figs)) { if (e.isIntersecting) f.rive.play(); else f.rive.pause(); }
    })).observe(talk);
  });
}
