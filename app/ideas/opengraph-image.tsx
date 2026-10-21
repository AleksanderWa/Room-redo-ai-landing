import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/content/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Room Redo AI ideas";

export default function Image() {
  return ogCard({ title: "Ideas", withBadges: false });
}
