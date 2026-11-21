// The blog's RSS feed: the newest 20 posts, full text, links made absolute.
import { getPosts } from "../../lib/posts";
import { SITE } from "../../lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rfc822 = (iso: string) => new Date(iso + "T08:00:00Z").toUTCString().replace("GMT", "+0000");

export function GET() {
  const items = getPosts().slice(0, 20).map((p) => `
  <item>
    <title>${esc(p.title)}</title>
    <link>${SITE}${p.url}</link>
    <guid isPermaLink="true">${SITE}${p.url}</guid>
    <pubDate>${rfc822(p.date)}</pubDate>
    <description>${esc(p.description)}</description>
    <content:encoded><![CDATA[${p.html.replaceAll('src="/', `src="${SITE}/`).replaceAll('href="/', `href="${SITE}/`).replaceAll("]]>", "]]]]><![CDATA[>")}]]></content:encoded>
  </item>`).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Wardlight: from the workshop</title>
  <link>${SITE}/blog/</link>
  <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Notes from building Wardlight alone in Vienna.</description>
  <language>en</language>${items}
</channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
