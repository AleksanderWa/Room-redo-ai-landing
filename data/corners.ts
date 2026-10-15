// Corners section: the app's corner-flow results for the under-stairs photo
// the section starts from. Source of truth is scripts/corner-results.json,
// which scripts/make-corner-crops.mjs also reads, so adding a result (e.g.
// "Store things" once its image exists) is one entry there: set its "file"
// and re-run the script. Entries without a file are listed but not shown.
import results from "@/scripts/corner-results.json";

export type CornerGroup = "usable" | "surprise";

export type CornerResult = {
  id: string;
  label: string;
  group: CornerGroup;
  caption: string;
  alt: string;
  img: string;
};

type Entry = Omit<CornerResult, "img"> & { file: string | null };

export const CORNER_BEFORE = {
  img: "/images/corner/understairs-before.jpg",
  alt: "The cluttered space under the stairs, before",
};

/** Group eyebrows, in the app's wording (CornerConfirmDock). */
export const CORNER_GROUPS: { id: CornerGroup; label: string }[] = [
  { id: "usable", label: "Make it usable" },
  { id: "surprise", label: "Surprise me" },
];

/** In chip order; only entries that have an image. */
export const CORNER_RESULTS: CornerResult[] = (results as Entry[])
  .filter((r) => r.file !== null)
  .map((r) => ({
    id: r.id,
    label: r.label,
    group: r.group,
    caption: r.caption,
    alt: r.alt,
    img: `/images/corner/understairs-${r.id}.jpg`,
  }));

export const CORNER_DEFAULT_ID = "pick";
