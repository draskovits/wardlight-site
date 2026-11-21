# playwardlight.com

The website of Wardlight: the one-pager in English and German, the press kit, support and privacy pages, and a blog
with scheduled posts. Built with [Astro](https://astro.build) into static files and published by GitHub Actions to
GitHub Pages.

## Run it

Node 22 (`nvm install 22 && nvm use 22`), then:

```
npm ci
npm run build              # what is due today (UTC) → dist/
npm run build:drafts       # also future-dated and draft posts, marked "Not published yet" (local look only)
npm run preview            # serves dist/ on http://localhost:8660
npm run dev                # live reload while editing, also on :8660
npm run check:layout       # with preview running: every page at 375–1440 px in headless Chrome
```

## Layout

| Path | What |
|---|---|
| `src/components/Home.astro` | The one-pager (both languages): the scroll film, the topics, the sheets, the gallery, the story, price, FAQ, latest posts, JSON-LD |
| `src/i18n/en.ts`, `de.ts` | All text of the one-pager. German is written, not translated (the game's `docs/localization/de-style.md`) |
| `src/pages/` | One file per URL: `index.astro` → `/`, `de/index.astro` → `/de/`, `support.astro` → `/support.html`, `press/index.astro` → `/press/`, `blog/[slug]/index.astro` → `/blog/<slug>/`, plus `blog/feed.xml`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, `404` |
| `src/layouts/` | `Base.astro` (the head of every page: title, canonical, link previews, App Store banner, analytics), `Page.astro` (inner pages) |
| `src/scripts/home.ts` | The film, reveals and parallax (Motion), loops, sheets, lands, lightbox, night counter |
| `src/scripts/characters.ts` | Vaelith and the dwarf in Rive, loaded only near the story section |
| `src/lib/posts.ts` | Reads `posts/*.md`, renders Markdown, decides what is published |
| `src/styles/site.css` | One stylesheet; the colours are the tokens at the top |
| `posts/*.md` | Blog posts |
| `llms.txt` | The summary for AI assistants; `{{posts}}` becomes the post list. The build also writes `llms-full.txt` |
| `public/` | Copied as is: `assets/` (images, loops, the film's frames, sound clips, logos, Rive files), `robots.txt`, `CNAME`, `icon.png` |
| `tools/images.mjs` | `npm run images`: AVIF and WebP next to every JPEG in `public/assets/img` |
| `.github/workflows/pages.yml` | Builds and publishes on every push to `main` and every morning at 05:00 UTC |

Every old URL still works: `/`, `/press/`, `/support.html`, `/datenschutz.html`, `/impressum.html`, `/blog/`,
`/blog/<slug>/`, `/blog/feed.xml`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/CNAME`, `/icon.png`,
`/assets/…`.

## A new blog post

1. Add `posts/YYYY-MM-DD-short-slug.md` (the URL is `/blog/short-slug/`):

   ```
   ---
   title: The title as it should appear
   date: 2026-12-15
   description: One or two sentences for search results and link previews.
   image: /assets/img/some-image.jpg
   tags: rendering, balance
   ---

   The text, in Markdown: ## headings, lists, `code`, ```fenced code```, > quotes, tables,
   images on their own line: ![alt text](/assets/img/x.jpg "Caption")
   and HTML where Markdown has nothing, e.g. a sound clip:
   <figure class="clip"><figcaption>Caption</figcaption><audio controls preload="none" src="/assets/audio/x.m4a"></audio></figure>
   ```

   Pictures go in `public/assets/img/` and are linked without `public`.
2. Push to `main`. A post dated today or earlier goes live with that push; a post dated in the future goes live on the
   morning of its date (the daily build). `draft: true` keeps a post off the site whatever its date.

Three or more `##` headings give the post a table of contents. Reading time, previous/next, the RSS feed, the sitemap,
`llms.txt`, the home page's "From the workshop" and the post's structured data all follow by themselves.

## Things to swap later

- The Blight portraits: `public/assets/blight/<kind>.webp`, 960 × 640 (3:2).
- The season boons shown in the season sheet: `seasons.sheet.boons.list` in `src/i18n/en.ts` and `de.ts`.

## One-time setup (done once when the domain moved here)

- GitHub → this repo → Settings → Pages → Source: **GitHub Actions**; custom domain `playwardlight.com`, Enforce HTTPS.
- Cloudflare DNS for `playwardlight.com`: four `A` records for `@` to 185.199.108.153, 185.199.109.153,
  185.199.110.153, 185.199.111.153 (DNS only, grey cloud), and `CNAME www` → `draskovits.github.io` (DNS only).
- The old address `draskovits.github.io/wardlight-site/` redirects to the domain by itself, so the App Store's support
  and privacy links keep working.
