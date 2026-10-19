import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const RULE = { allow: "/", disallow: "/api/" };

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", ...RULE },
      // Named explicitly so Google, Bing and ChatGPT search are clearly welcome.
      { userAgent: "Googlebot", ...RULE },
      { userAgent: "Bingbot", ...RULE },
      { userAgent: "OAI-SearchBot", ...RULE },
      { userAgent: "ChatGPT-User", ...RULE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
