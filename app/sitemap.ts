import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Fixed dates, bumped by hand when a page's content changes. Not
// `new Date()`: that would stamp every build as "modified now", and search
// engines learn to ignore lastmod when it is always fresh.
const HOME_LAST_MODIFIED = "2026-10-19";
const PRIVACY_LAST_MODIFIED = "2026-10-19";
const TERMS_LAST_MODIFIED = "2026-10-19";

export default function sitemap(): MetadataRoute.Sitemap {
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
  ];
}
