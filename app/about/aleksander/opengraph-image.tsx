import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/content/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Aleksander, Room Redo AI";

export default function Image() {
  return ogCard({ title: "Aleksander", withBadges: false });
}
