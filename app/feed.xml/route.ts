import { articlePath, getPublishedArticles } from "@/lib/content/load";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const dynamic = "force-static";

// Static: built once. No `new Date()`; the feed's dates come from the articles.
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const rfc822 = (iso: string) => new Date(`${iso}T00:00:00Z`).toUTCString();

export function GET() {
  const articles = getPublishedArticles();
  const lastBuild = articles.reduce((m, a) => (a.dateModified > m ? a.dateModified : m), "2026-10-20");

  const items = articles
    .map((a) => {
      const url = `${SITE_URL}${articlePath(a)}`;
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(a.datePublished)}</pubDate>
      <author>${SUPPORT_EMAIL} (Aleksander)</author>
      <description>${esc(a.description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Room Redo AI</title>
    <link>${SITE_URL}</link>
    <description>Guides and ideas for redesigning a room from a photo, from the person who built the app.</description>
    <language>en-us</language>
    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
