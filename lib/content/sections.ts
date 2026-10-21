import type { ArticleType } from "@/lib/content/schema";

/** Per-type copy for the hub page and the breadcrumbs. */
export type HubPlacement = "guides-hub" | "ideas-hub";

/** `hubPlacement` is the analytics placement and App Store `ct` fallback of the
 * hub's closing CTA, so each section's installs are read on their own. */
export const SECTIONS: Record<
  ArticleType,
  { label: string; path: string; description: string; empty: string; hubPlacement: HubPlacement }
> = {
  guides: {
    label: "Guides",
    path: "/guides",
    description: "Plain advice on redesigning a room from a photo, written by the person who built the app.",
    empty: "Guides are on the way.",
    hubPlacement: "guides-hub",
  },
  ideas: {
    label: "Ideas",
    path: "/ideas",
    description: "Room and style ideas to try on your own photo, with the same room shown in more than one look.",
    empty: "Ideas are on the way.",
    hubPlacement: "ideas-hub",
  },
};
