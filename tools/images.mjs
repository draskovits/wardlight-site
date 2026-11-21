// Writes AVIF and WebP siblings for the JPEG store art in public/assets/img (seasons-1600.jpg → seasons-1600.avif,
// seasons-1600.webp). The JPEGs stay: the press kit and the App Store link to them. Run after adding or replacing a
// JPEG there:  npm run images   (sharp comes with Astro). Existing siblings are kept unless --force.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = path.resolve("public/assets/img");
const force = process.argv.includes("--force");
for (const f of fs.readdirSync(dir).filter((f) => /-\d+\.jpg$/.test(f))) {
  const src = path.join(dir, f);
  for (const [ext, opts] of [["webp", { quality: 80 }], ["avif", { quality: 55, effort: 6 }]]) {
    const out = src.replace(/\.jpg$/, "." + ext);
    if (!force && fs.existsSync(out)) continue;
    await sharp(src)[ext](opts).toFile(out);
    console.log(`${path.basename(out)}  ${Math.round(fs.statSync(out).size / 1024)} KB (jpg ${Math.round(fs.statSync(src).size / 1024)} KB)`);
  }
}
