// The game guide: guide/<slug>.md, written by the game repo's Tools/site/guide.py from the game's data (Content/).
// Don't edit those files by hand: rerun the generator. Front matter: title, description, order (index.md is the
// guide's front page). Rendered like the blog's posts, and given to AIs whole in llms-full.txt.
import fs from "node:fs";
import path from "node:path";
import { render } from "./posts";

const GUIDE = path.join(process.cwd(), "guide");

export interface GuidePage {
  slug: string;
  url: string;
  title: string;
  description: string;
  order: number;
  updated: string;
  html: string;
  heads: { id: string; title: string }[];
}

let cache: GuidePage[] | null = null;

/** Every guide page, the front page first, then by `order`. */
export function getGuide(): GuidePage[] {
  if (cache) return cache;
  const pages: GuidePage[] = [];
  const files = fs.existsSync(GUIDE) ? fs.readdirSync(GUIDE).filter((f) => f.endsWith(".md")).sort() : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(GUIDE, file), "utf8").replace(/\r\n/g, "\n");
    const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) throw new Error(`guide/${file}: missing front matter`);
    const meta: Record<string, string> = {};
    for (const row of m[1].split("\n")) {
      const at = row.indexOf(":");
      if (at > 0) meta[row.slice(0, at).trim()] = row.slice(at + 1).trim();
    }
    for (const key of ["title", "description"]) if (!meta[key]) throw new Error(`guide/${file}: front matter needs '${key}'`);
    const slug = file.replace(/\.md$/, "");
    const { html, heads } = render(m[2]);
    pages.push({
      slug, url: slug === "index" ? "/guide/" : `/guide/${slug}/`, title: meta.title, description: meta.description,
      order: slug === "index" ? -1 : Number(meta.order ?? 99), updated: meta.updated ?? "", html, heads,
    });
  }
  pages.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
  cache = pages;
  return pages;
}
