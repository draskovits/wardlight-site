// Every page for search engines; the two home pages name each other (hreflang).
import { getPosts, todayUTC } from "../lib/posts";
import { getGuide } from "../lib/guide";
import { SITE } from "../lib/site";

export function GET() {
  const today = todayUTC();
  const home = (loc: string) => `
  <url><loc>${SITE}${loc}</loc><lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/"/>
    <xhtml:link rel="alternate" hreflang="de" href="${SITE}/de/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>
  </url>`;
  const page = (loc: string, d = today) => `
  <url><loc>${SITE}${loc}</loc><lastmod>${d}</lastmod></url>`;
  const rows = [home("/"), home("/de/"), ...["/blog/", "/press/", "/support.html", "/datenschutz.html"].map((u) => page(u)),
    ...getGuide().map((g) => page(g.url, g.updated || today)),
    ...getPosts().filter((p) => !p.pending).map((p) => page(p.url, p.date))].join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${rows}
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
