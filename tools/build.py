#!/usr/bin/env python3
"""Builds playwardlight.com into _site/.

No dependencies: plain Python 3.10+. Run from the repo root:

    python3 tools/build.py            # build what is due today (UTC)
    python3 tools/build.py --drafts   # also build future-dated and draft posts (local preview only)
    python3 tools/build.py --serve    # build with drafts, then serve _site on http://localhost:8640

Posts live in posts/YYYY-MM-DD-slug.md with a small front matter block:

    ---
    title: How thousands of Blight fit on an iPhone
    date: 2026-12-01
    description: One or two sentences for search results and link previews.
    image: /assets/img/horde-wall.jpg      (optional, the link preview image)
    tags: metal, rendering                 (optional)
    draft: true                            (optional, never published)
    ---

A post goes live on the first build on or after its date. The GitHub workflow builds every morning, so dating a post
in the future schedules it.
"""
from __future__ import annotations

import datetime as dt
import html
import json
import re
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"
SITE = "https://playwardlight.com"
SITE_NAME = "Wardlight"
AUTHOR = "Stefan Draskovits"
APP_STORE = "https://apps.apple.com/app/id6826542922"
SKIP = {".git", ".github", "_site", "tools", "posts", "templates", ".DS_Store", "README.md", ".gitignore"}


# ---------------------------------------------------------------- Markdown (the small subset the posts use)

def inline(text: str) -> str:
    """Escapes text and applies inline Markdown: code, images, links, bold, italic."""
    codes: list[str] = []

    def keep_code(m: re.Match) -> str:
        codes.append(f"<code>{html.escape(m.group(1))}</code>")
        return f"\x00{len(codes) - 1}\x00"

    text = re.sub(r"`([^`]+)`", keep_code, text)
    text = html.escape(text, quote=False)
    text = re.sub(r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)',
                  lambda m: f'<img src="{m.group(2)}" alt="{m.group(1)}" loading="lazy" decoding="async">', text)
    text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)",
                  lambda m: f'<a href="{m.group(2)}"'
                            + (' rel="noopener"' if m.group(2).startswith("http") else "") + f">{m.group(1)}</a>",
                  text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", text)
    text = re.sub(r"(?<![\w_])_([^_\n]+)_(?![\w_])", r"<em>\1</em>", text)
    return re.sub(r"\x00(\d+)\x00", lambda m: codes[int(m.group(1))], text)


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def markdown(src: str) -> tuple[str, list[tuple[str, str]]]:
    """Returns (html, headings). Supports headings, paragraphs, lists, quotes, fenced code, figures, rules, tables."""
    lines = src.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    heads: list[tuple[str, str]] = []
    i = 0
    para: list[str] = []

    def flush() -> None:
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
            para.clear()

    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if s.startswith("```"):
            flush()
            lang = s[3:].strip()
            body = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                body.append(lines[i])
                i += 1
            cls = f' class="lang-{html.escape(lang)}"' if lang else ""
            out.append(f"<pre><code{cls}>{html.escape(chr(10).join(body))}</code></pre>")
        elif not s:
            flush()
        elif m := re.match(r"(#{2,4})\s+(.*)", s):
            flush()
            level, title = len(m.group(1)), m.group(2).strip()
            anchor = slugify(title)
            if level == 2:
                heads.append((anchor, title))
            out.append(f'<h{level} id="{anchor}">{inline(title)}</h{level}>')
        elif re.fullmatch(r"(-{3,}|\*{3,})", s):
            flush()
            out.append("<hr>")
        elif m := re.fullmatch(r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)', s):
            flush()
            alt, src_, cap = m.group(1), m.group(2), m.group(3)
            fig = f'<figure><img src="{src_}" alt="{html.escape(alt)}" loading="lazy" decoding="async">'
            if cap:
                fig += f"<figcaption>{inline(cap)}</figcaption>"
            out.append(fig + "</figure>")
        elif s.startswith(">"):
            flush()
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip()[1:].strip())
                i += 1
            inner, _ = markdown("\n".join(quote))
            out.append(f"<blockquote>{inner}</blockquote>")
            continue
        elif re.match(r"([-*]|\d+\.)\s+", s):
            flush()
            ordered = bool(re.match(r"\d+\.", s))
            items = []
            while i < len(lines) and re.match(r"\s*([-*]|\d+\.)\s+", lines[i]):
                item = re.sub(r"\s*([-*]|\d+\.)\s+", "", lines[i], count=1)
                i += 1
                while i < len(lines) and lines[i].startswith("  ") and lines[i].strip():
                    item += " " + lines[i].strip()
                    i += 1
                items.append(f"<li>{inline(item)}</li>")
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>{''.join(items)}</{tag}>")
            continue
        elif s.startswith("|") and i + 1 < len(lines) and re.fullmatch(r"\|?[\s:|-]+\|?", lines[i + 1].strip()):
            flush()
            def cells(row: str) -> list[str]:
                return [c.strip() for c in row.strip().strip("|").split("|")]
            head = cells(s)
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(cells(lines[i]))
                i += 1
            t = "<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
            t += "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows)
            out.append(t + "</tbody></table>")
            continue
        else:
            para.append(s)
        i += 1
    flush()
    return "\n".join(out), heads


# ---------------------------------------------------------------- posts

@dataclass
class Post:
    slug: str
    title: str
    date: dt.date
    description: str
    body: str
    image: str = ""
    tags: list[str] = field(default_factory=list)
    draft: bool = False
    words: int = 0
    heads: list[tuple[str, str]] = field(default_factory=list)

    @property
    def url(self) -> str:
        return f"/blog/{self.slug}/"


def read_posts(include_future: bool) -> list[Post]:
    today = dt.datetime.now(dt.timezone.utc).date()
    posts = []
    for path in sorted((ROOT / "posts").glob("*.md")):
        text = path.read_text(encoding="utf-8")
        m = re.match(r"---\n(.*?)\n---\n(.*)", text, re.S)
        if not m:
            sys.exit(f"{path.name}: missing front matter")
        meta = {}
        for row in m.group(1).splitlines():
            if ":" in row:
                k, v = row.split(":", 1)
                meta[k.strip()] = v.strip()
        for key in ("title", "date", "description"):
            if key not in meta:
                sys.exit(f"{path.name}: front matter needs '{key}'")
        date = dt.date.fromisoformat(meta["date"])
        draft = meta.get("draft", "").lower() == "true"
        if not include_future and (draft or date > today):
            continue
        slug = meta.get("slug") or re.sub(r"^\d{4}-\d{2}-\d{2}-", "", path.stem)
        body, heads = markdown(m.group(2))
        posts.append(Post(slug=slug, title=meta["title"], date=date, description=meta["description"], body=body,
                          image=meta.get("image", ""), draft=draft,
                          tags=[t.strip() for t in meta.get("tags", "").split(",") if t.strip()],
                          words=len(re.findall(r"\w+", m.group(2))), heads=heads))
    return sorted(posts, key=lambda p: p.date, reverse=True)


def nice_date(d: dt.date) -> str:
    return f"{d.day} {d.strftime('%B %Y')}"


# ---------------------------------------------------------------- pages

def page(title: str, description: str, canonical: str, body: str, *, image: str = "/assets/img/og.jpg",
         og_type: str = "website", jsonld: dict | None = None, extra_head: str = "") -> str:
    tpl = (ROOT / "templates" / "page.html").read_text(encoding="utf-8")
    ld = f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>' if jsonld else ""
    return (tpl.replace("{{title}}", html.escape(title))
               .replace("{{description}}", html.escape(description))
               .replace("{{canonical}}", SITE + canonical)
               .replace("{{image}}", SITE + image if image.startswith("/") else image)
               .replace("{{og_type}}", og_type)
               .replace("{{head}}", ld + extra_head)
               .replace("{{body}}", body))


def post_page(p: Post, newer: Post | None, older: Post | None) -> str:
    minutes = max(1, round(p.words / 220))
    toc = ""
    if len(p.heads) >= 3:
        toc = '<nav class="toc" aria-label="In this post"><p>In this post</p><ol>' + "".join(
            f'<li><a href="#{a}">{html.escape(t)}</a></li>' for a, t in p.heads) + "</ol></nav>"
    nav = '<nav class="post-nav" aria-label="More posts">'
    nav += f'<a rel="prev" href="{older.url}"><span>Older</span>{html.escape(older.title)}</a>' if older else "<span></span>"
    nav += f'<a rel="next" href="{newer.url}"><span>Newer</span>{html.escape(newer.title)}</a>' if newer else "<span></span>"
    nav += "</nav>"
    draft = '<p class="draft-flag">Not published yet: dated ' + p.date.isoformat() + "</p>" if (
        p.draft or p.date > dt.datetime.now(dt.timezone.utc).date()) else ""
    body = f"""
<main class="post" id="main">
  <article>
    <header class="post-head">
      <p class="kicker"><a href="/blog/">From the workshop</a></p>
      <h1>{html.escape(p.title)}</h1>
      <p class="byline"><time datetime="{p.date.isoformat()}">{nice_date(p.date)}</time> · {minutes} min read · {AUTHOR}</p>
      {draft}
    </header>
    {toc}
    <div class="prose">
{p.body}
    </div>
    <footer class="post-foot">
      <p>Wardlight is a city builder and tower defence for iPhone and iPad, made by one developer in Vienna.
        Free to play, one purchase for the full game, no ads.</p>
      <p><a class="btn" href="{APP_STORE}">Wardlight on the App Store</a> <a href="/blog/feed.xml">Follow by RSS</a></p>
    </footer>
  </article>
  {nav}
</main>"""
    image = p.image or "/assets/img/og.jpg"
    ld = {
        "@context": "https://schema.org", "@type": "BlogPosting", "headline": p.title,
        "description": p.description, "datePublished": p.date.isoformat(), "dateModified": p.date.isoformat(),
        "author": {"@type": "Person", "name": AUTHOR, "url": SITE + "/#developer"},
        "publisher": {"@type": "Person", "name": AUTHOR},
        "image": SITE + image, "mainEntityOfPage": SITE + p.url, "keywords": ", ".join(p.tags),
        "about": {"@type": "VideoGame", "name": SITE_NAME, "url": SITE + "/"},
        "wordCount": p.words, "inLanguage": "en",
    }
    return page(f"{p.title} · Wardlight", p.description, p.url, body, image=image, og_type="article", jsonld=ld,
                extra_head=f'<meta property="article:published_time" content="{p.date.isoformat()}">')


def blog_index(posts: list[Post]) -> str:
    items = "".join(f"""
    <li>
      <time datetime="{p.date.isoformat()}">{nice_date(p.date)}</time>
      <h2><a href="{p.url}">{html.escape(p.title)}</a></h2>
      <p>{html.escape(p.description)}</p>
    </li>""" for p in posts) or "<li><p>The first post is on its way.</p></li>"
    body = f"""
<main class="blog" id="main">
  <header class="post-head">
    <p class="kicker">From the workshop</p>
    <h1>How the game gets made</h1>
    <p class="lede">Notes from building Wardlight alone: the renderer, the balance, the words, the mistakes.
      A new post now and then, and an <a href="/blog/feed.xml">RSS feed</a> if you'd like to know when.</p>
  </header>
  <ol class="post-list">{items}
  </ol>
</main>"""
    ld = {"@context": "https://schema.org", "@type": "Blog", "name": "Wardlight: from the workshop",
          "url": SITE + "/blog/", "author": {"@type": "Person", "name": AUTHOR},
          "blogPost": [{"@type": "BlogPosting", "headline": p.title, "url": SITE + p.url,
                        "datePublished": p.date.isoformat()} for p in posts]}
    return page("From the workshop · Wardlight", "Notes from building Wardlight, a city builder and tower defence "
                "for iPhone and iPad, alone in Vienna: rendering, balance, writing and mistakes.", "/blog/", body,
                jsonld=ld, extra_head='<link rel="alternate" type="application/rss+xml" title="Wardlight: from the '
                'workshop" href="/blog/feed.xml">')


def latest_block(posts: list[Post]) -> str:
    if not posts:
        return '<p class="none">The first post goes up with the launch.</p>'
    return "<ol>" + "".join(f"""
      <li><a href="{p.url}"><time datetime="{p.date.isoformat()}">{nice_date(p.date)}</time>
        <span class="t">{html.escape(p.title)}</span><span class="d">{html.escape(p.description)}</span></a></li>"""
        for p in posts[:3]) + "\n    </ol>"


def feed(posts: list[Post]) -> str:
    def rfc822(d: dt.date) -> str:
        return dt.datetime(d.year, d.month, d.day, 8, 0, tzinfo=dt.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    items = "".join(f"""
  <item>
    <title>{html.escape(p.title)}</title>
    <link>{SITE}{p.url}</link>
    <guid isPermaLink="true">{SITE}{p.url}</guid>
    <pubDate>{rfc822(p.date)}</pubDate>
    <description>{html.escape(p.description)}</description>
    <content:encoded><![CDATA[{p.body.replace('src="/', f'src="{SITE}/').replace('href="/', f'href="{SITE}/')}]]></content:encoded>
  </item>""" for p in posts[:20])
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Wardlight: from the workshop</title>
  <link>{SITE}/blog/</link>
  <atom:link href="{SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Notes from building Wardlight alone in Vienna.</description>
  <language>en</language>{items}
</channel>
</rss>
"""


def sitemap(posts: list[Post], pages: list[str]) -> str:
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    urls = [(SITE + u, today) for u in pages] + [(SITE + p.url, p.date.isoformat()) for p in posts]
    rows = "".join(f"\n  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>" for u, d in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{rows}\n</urlset>\n'


def llms_posts(posts: list[Post]) -> str:
    return "\n".join(f"- [{p.title}]({SITE}{p.url}): {p.description}" for p in posts) or "- (none yet)"


def llms_full(posts: list[Post]) -> str:
    """The posts as plain text, for language models that read llms-full.txt."""
    def text(h: str) -> str:
        h = re.sub(r"<pre><code[^>]*>(.*?)</code></pre>", lambda m: "\n" + html.unescape(m.group(1)) + "\n", h, flags=re.S)
        h = re.sub(r"<h(\d)[^>]*>(.*?)</h\1>", lambda m: "\n" + "#" * int(m.group(1)) + " " + m.group(2) + "\n", h)
        h = re.sub(r"<li>", "- ", h)
        h = re.sub(r"</(p|li|blockquote|figure|tr)>", "\n", h)
        return html.unescape(re.sub(r"<[^>]+>", "", h)).strip()
    head = (ROOT / "llms.txt").read_text(encoding="utf-8").replace("{{posts}}", llms_posts(posts))
    return head + "\n\n" + "\n\n".join(
        f"---\n\n# {p.title}\n\n{SITE}{p.url} · {p.date.isoformat()}\n\n{text(p.body)}" for p in posts) + "\n"


# ---------------------------------------------------------------- build

def build(include_future: bool) -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for item in ROOT.iterdir():
        if item.name in SKIP or item.name.startswith("."):
            continue
        dest = OUT / item.name
        shutil.copytree(item, dest, ignore=shutil.ignore_patterns(".DS_Store")) if item.is_dir() else shutil.copy2(item, dest)

    posts = read_posts(include_future)
    for idx, p in enumerate(posts):
        d = OUT / "blog" / p.slug
        d.mkdir(parents=True, exist_ok=True)
        newer = posts[idx - 1] if idx > 0 else None
        older = posts[idx + 1] if idx + 1 < len(posts) else None
        (d / "index.html").write_text(post_page(p, newer, older), encoding="utf-8")
    (OUT / "blog").mkdir(exist_ok=True)
    (OUT / "blog" / "index.html").write_text(blog_index(posts), encoding="utf-8")
    (OUT / "blog" / "feed.xml").write_text(feed(posts), encoding="utf-8")

    index = OUT / "index.html"
    index.write_text(index.read_text(encoding="utf-8").replace("<!--LATEST-->", latest_block(posts)), encoding="utf-8")
    (OUT / "llms.txt").write_text((ROOT / "llms.txt").read_text(encoding="utf-8").replace("{{posts}}", llms_posts(posts)),
                                  encoding="utf-8")
    (OUT / "llms-full.txt").write_text(llms_full(posts), encoding="utf-8")
    (OUT / "sitemap.xml").write_text(sitemap(posts, ["/", "/blog/", "/press/", "/support.html", "/datenschutz.html",
                                                     "/impressum.html"]), encoding="utf-8")
    shown = ", ".join(f"{p.date} {p.slug}" for p in posts) or "none"
    print(f"Built {OUT.relative_to(ROOT)}/ with {len(posts)} post(s): {shown}")


if __name__ == "__main__":
    serve = "--serve" in sys.argv
    build(include_future="--drafts" in sys.argv or serve)
    if serve:
        import functools
        import http.server
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(OUT))
        print("Serving on http://localhost:8640")
        http.server.ThreadingHTTPServer(("127.0.0.1", 8640), handler).serve_forever()
