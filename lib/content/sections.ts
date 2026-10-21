import type { ArticleType } from "@/lib/content/schema";

/** Per-type copy for the hub page and the breadcrumbs. */
export const SECTIONS: Record<ArticleType, { label: string; path: string; description: string; empty: string }> = {
  guides: {
    label: "Guides",
    path: "/guides",
    description: "Plain advice on redesigning a room from a photo, written by the person who built the app.",
    empty: "Guides are on the way.",
  },
  ideas: {
    label: "Ideas",
    path: "/ideas",
    description: "Room and style ideas to try on your own photo, with the same room shown in more than one look.",
    empty: "Ideas are on the way.",
  },
};
