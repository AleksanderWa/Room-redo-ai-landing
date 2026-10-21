import type { MetadataRoute } from "next";
import { articlePath, getPublishedArticles } from "@/lib/content/load";
import { SECTIONS } from "@/lib/content/sections";
import { SITE_URL } from "@/lib/site";

// Fixed dates, bumped by hand when a page's content changes. Not
// `new Date()`: that would stamp every build as "modified now", and search
// engines learn to ignore lastmod when it is always fresh.
const HOME_LAST_MODIFIED = "2026-10-19";
const PRIVACY_LAST_MODIFIED = "2026-10-19";
const TERMS_LAST_MODIFIED = "2026-10-19";
// Hand-bumped when the bio changes. Articles use their own dateModified.
const AUTHOR_LAST_MODIFIED = "2026-10-20";

const HUBS = ["guides", "ideas"] as const;

const latestModified = (list: { dateModified: string }[]) =>
  list.reduce((latest, a) => (a.dateModified > latest ? a.dateModified : latest), "");

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getPublishedArticles();
  // The hub changes when an article is added or edited. Left out while it
  // has nothing to list (it is noindex then).
  return [
    {
      url: SITE_URL,
      lastModified: HOME_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: PRIVACY_LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: TERMS_LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...HUBS.flatMap((type) => {
      const ofType = articles.filter((a) => a.type === type);
      if (ofType.length === 0) return [];
      return [
        {
          url: `${SITE_URL}${SECTIONS[type].path}`,
          lastModified: latestModified(ofType),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        },
      ];
    }),
    {
      url: `${SITE_URL}/about/aleksander`,
      lastModified: AUTHOR_LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    ...articles.map((a) => ({
      url: `${SITE_URL}${articlePath(a)}`,
      lastModified: a.dateModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
