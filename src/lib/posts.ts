// The blog: posts/YYYY-MM-DD-slug.md, read and rendered at build time.
//
// Front matter (one `key: value` per line):
//   title, date (YYYY-MM-DD), description   required
//   image (link preview), tags (comma separated), draft (true), slug   optional
//
// A post is built on the first build on or after its date (UTC) unless it is a draft. The workflow builds every
// morning at 05:00 UTC, so a future date schedules a post. `npm run build:drafts` (WARDLIGHT_DRAFTS=1) builds every
// post for a local look, marked "Not published yet".
import fs from "node:fs";
import path from "node:path";
import MarkdownIt from "markdown-it";
import { imageSize } from "image-size";

const ROOT = process.cwd();
const POSTS = path.join(ROOT, "posts");
const PUBLIC = path.join(ROOT, "public");

export interface Post {
  slug: string;
  url: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  image: string;
  tags: string[];
  draft: boolean;
  /** Not out yet on the build day (only built with drafts). */
  pending: boolean;
  words: number;
  minutes: number;
  html: string;
  heads: { id: string; title: string }[];
}

export const todayUTC = () => new Date().toISOString().slice(0, 10);
export const includeDrafts = () => process.env.WARDLIGHT_DRAFTS === "1";

/** "21 November 2026" */
export const niceDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${d.toLocaleString("en-GB", { month: "long", timeZone: "UTC" })} ${d.getUTCFullYear()}`;
};

/** The same anchors the old Python build made: lower case, every run of other characters a dash. */
export const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const sizeCache = new Map<string, { width: number; height: number } | null>();
/** Width and height of a local image under public/, so every picture reserves its space. */
export function sizeOf(src: string) {
  if (!src.startsWith("/")) return null;
  if (sizeCache.has(src)) return sizeCache.get(src)!;
  let size: { width: number; height: number } | null = null;
  try {
    const s = imageSize(fs.readFileSync(path.join(PUBLIC, decodeURI(src))));
    if (s.width && s.height) size = { width: s.width, height: s.height };
  } catch {
    size = null;
  }
  sizeCache.set(src, size);
  return size;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function markdown() {
  const md = new MarkdownIt({ html: true, linkify: false, typographer: false });
  // headings: build.py's anchors
  md.renderer.rules.heading_open = (tokens, i) => {
    const inline = tokens[i + 1];
    const text = inline.children?.map((c) => c.content).join("") ?? inline.content;
    return `<${tokens[i].tag} id="${slugify(text)}">`;
  };
  // pictures reserve their space and load late
  md.renderer.rules.image = (tokens, i) => {
    const t = tokens[i];
    const src = t.attrGet("src") ?? "";
    const alt = t.children ? t.children.map((c) => c.content).join("") : t.content;
    const size = sizeOf(src);
    const dims = size ? ` width="${size.width}" height="${size.height}"` : "";
    const title = t.attrGet("title");
    return `<img src="${esc(src)}" alt="${esc(alt)}"${dims} loading="lazy" decoding="async"${title ? ` data-caption="${esc(title)}"` : ""}>`;
  };
  // outside links open as they are, without passing on the opener
  const link = md.renderer.rules.link_open ?? ((tokens, i, o, _e, self) => self.renderToken(tokens, i, o));
  md.renderer.rules.link_open = (tokens, i, o, e, self) => {
    const href = tokens[i].attrGet("href") ?? "";
    if (href.startsWith("http")) tokens[i].attrSet("rel", "noopener");
    return link(tokens, i, o, e, self);
  };
  md.renderer.rules.fence = (tokens, i) => {
    const t = tokens[i];
    const lang = t.info.trim();
    return `<pre><code${lang ? ` class="lang-${esc(lang)}"` : ""}>${esc(t.content.replace(/\n$/, ""))}</code></pre>\n`;
  };
  return md;
}

export function render(src: string) {
  let html = markdown().render(src);
  // a picture on its own line is a figure; its title is the caption
  html = html.replace(/<p>(<img [^>]*?)(?: data-caption="([^"]*)")?([^>]*>)<\/p>/g, (_m, a, cap, b) =>
    `<figure>${a}${b}${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`);
  html = html.replace(/ data-caption="[^"]*"/g, "");
  const heads = [...html.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)].map((m) => ({ id: m[1], title: m[2].replace(/<[^>]+>/g, "") }));
  return { html, heads };
}

function frontMatter(file: string, text: string) {
  const m = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta: Record<string, string> = {};
  for (const row of m[1].split("\n")) {
    const at = row.indexOf(":");
    if (at > 0) meta[row.slice(0, at).trim()] = row.slice(at + 1).trim();
  }
  for (const key of ["title", "date", "description"]) if (!meta[key]) throw new Error(`${file}: front matter needs '${key}'`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${file}: date must be YYYY-MM-DD`);
  return { meta, body: m[2] };
}

let cache: Post[] | null = null;

/** Every post that is out on the build day, newest first (with drafts: every post). */
export function getPosts(): Post[] {
  if (cache) return cache;
  const today = todayUTC();
  const all = includeDrafts();
  const posts: Post[] = [];
  for (const file of fs.readdirSync(POSTS).filter((f) => f.endsWith(".md")).sort()) {
    const { meta, body } = frontMatter(file, fs.readFileSync(path.join(POSTS, file), "utf8"));
    const draft = meta.draft?.toLowerCase() === "true";
    const pending = draft || meta.date > today;
    if (pending && !all) continue;
    const slug = meta.slug || file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
    const words = (body.match(/\w+/g) ?? []).length;
    const { html, heads } = render(body);
    posts.push({
      slug, url: `/blog/${slug}/`, title: meta.title, date: meta.date, description: meta.description,
      image: meta.image || "", tags: (meta.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
      draft, pending, words, minutes: Math.max(1, Math.round(words / 220)), html, heads,
    });
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  cache = posts;
  return posts;
}

/** A post's HTML as plain text, for llms-full.txt. */
export function plainText(h: string) {
  const unescape = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  h = h.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (_m, c) => "\n" + unescape(c) + "\n");
  h = h.replace(/<h(\d)[^>]*>(.*?)<\/h\1>/g, (_m, n, t) => "\n" + "#".repeat(+n) + " " + t + "\n");
  h = h.replace(/<\/t[dh]>\s*<t[dh][^>]*>/g, " | ");
  h = h.replace(/<li>/g, "- ");
  h = h.replace(/<\/(p|li|blockquote|figure|tr)>/g, "\n");
  return unescape(h.replace(/<[^>]+>/g, "")).replace(/\n{3,}/g, "\n\n").trim();
}
