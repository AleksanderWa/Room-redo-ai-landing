import { notFound } from "next/navigation";
import { hasPublished } from "@/lib/content/load";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/content/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Room Redo AI ideas";

// The hub 404s until ideas has a published article; so does its card.
export default function Image() {
  if (!hasPublished("ideas")) notFound();
  return ogCard({ title: "Ideas", withBadges: false });
}
