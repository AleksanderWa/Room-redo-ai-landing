// Corners section: the app's corner-flow results for the under-stairs photo
// the section starts from. Source of truth is scripts/corner-results.json,
// which scripts/make-corner-crops.mjs also reads, so adding a result (e.g.
// "Store things" once its image exists) is one entry there: set its "file"
// and re-run the script.
//
// Server-only (reads the filesystem at build time); CornerShowcase gets the
// list as props from app/page.tsx.
import { existsSync } from "node:fs";
import { join } from "node:path";
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

type Entry = Omit<CornerResult, "img" | "group"> & { group: string; file: string | null };

export const CORNER_BEFORE = {
  img: "/images/corner/understairs-before.jpg",
  alt: "The cluttered space under the stairs, before",
};

/** Eyebrow over the chips, in the app's wording (CornerConfirmDock). */
export const USABLE_EYEBROW = "Make it usable";

export const CORNER_DEFAULT_ID = "pick";

// "Has a result" rule; keep in sync with make-corner-crops.mjs and
// copy-assets.sh (same expression).
const hasResult = (r: Entry) => typeof r.file === "string" && r.file.trim() !== "";

/** In chip order: entries with a result whose image is actually in public/. */
export const CORNER_RESULTS: CornerResult[] = (results as Entry[]).filter(hasResult).flatMap((r) => {
  const img = `/images/corner/understairs-${r.id}.jpg`;
  if (!existsSync(join(process.cwd(), "public", img))) {
    console.warn(
      `[corners] "${r.id}" has file "${r.file}" in scripts/corner-results.json but public${img} ` +
        "doesn't exist; skipping its chip. Run scripts/make-corner-crops.mjs (or copy-assets.sh)."
    );
    return [];
  }
  return [
    {
      id: r.id,
      label: r.label,
      group: r.group === "surprise" ? "surprise" : "usable",
      caption: r.caption,
      alt: r.alt,
      img,
    },
  ];
});
