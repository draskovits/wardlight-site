# playwardlight.com

The website of Wardlight: a one-pager, the press kit, support and privacy pages, and a blog with scheduled posts.
Plain HTML and CSS, one small Python build script without dependencies, published by GitHub Actions to GitHub Pages.

## Layout

| Path | What |
|---|---|
| `index.html` | The one-pager. `<!--LATEST-->` is replaced by the three newest posts at build time |
| `press/index.html` | Press kit: facts, descriptions, screenshots, logos |
| `support.html`, `datenschutz.html`, `impressum.html` | Support, privacy policy (App Store links point here), legal notice |
| `posts/*.md` | Blog posts, one Markdown file each |
| `templates/page.html` | The shell for blog pages |
| `assets/` | `site.css`, `site.js`, images (`img/`), logos (`brand/`), icons (`icon/`) |
| `llms.txt` | A plain summary for AI assistants; `{{posts}}` becomes the post list. The build also writes `llms-full.txt` with every post as text |
| `robots.txt`, `CNAME` | Crawlers welcome; the custom domain |
| `tools/build.py` | Builds everything into `_site/` |
| `.github/workflows/pages.yml` | Builds and publishes on every push to `main` and every morning at 05:00 UTC |

## A new blog post

1. Add `posts/YYYY-MM-DD-short-slug.md`:

   ```
   ---
   title: The title as it should appear
   date: 2026-12-15
   description: One or two sentences for search results and link previews.
   image: /assets/img/some-image.jpg
   tags: rendering, balance
   ---

   The text, in Markdown: ## headings, lists, `code`, ```fenced code```, > quotes, tables,
   and images on their own line: ![alt text](/assets/img/x.jpg "Caption")
   ```

2. Push to `main`. A post dated today or earlier goes live with that push; a post dated in the future goes live on
   the morning of its date (the daily build). `draft: true` keeps a post off the site whatever its date.

Preview locally with every post, future and draft ones included (they carry a "Not published yet" mark):

```
python3 tools/build.py --serve
```

then open http://localhost:8640.

## One-time setup (done once when the domain moved here)

- GitHub → this repo → Settings → Pages → Source: **GitHub Actions**; custom domain `playwardlight.com`, Enforce HTTPS.
- Cloudflare DNS for `playwardlight.com`: four `A` records for `@` to 185.199.108.153, 185.199.109.153,
  185.199.110.153, 185.199.111.153 (DNS only, grey cloud), and `CNAME www` → `draskovits.github.io` (DNS only).
- The old address `draskovits.github.io/wardlight-site/` redirects to the domain by itself, so the App Store's support
  and privacy links keep working.
