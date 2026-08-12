// Ported from the source design's `steps` array, with one deliberate fix:
// the source used three different rooms across the three steps, which broke
// the "one room, transformed" narrative. Step 1 and step 3 now use the same
// room as the hero slider (before/after), and step 2 keeps a style card.
//
// Note: `design-assets/08-roomdetail-japandi.jpg` (public/images/detail-japandi.jpg)
// is still copied into the project per the asset mapping, but is intentionally
// unused after this fix — kept for traceability / a possible future section,
// not a bug.
export type Step = {
  num: string;
  line: string;
  img: string;
};

export const steps: Step[] = [
  { num: "01", line: "Snap one photo of your room.", img: "/images/hero-before.jpg" },
  { num: "02", line: "Pick from six designer styles.", img: "/images/style-coastal.jpg" },
  { num: "03", line: "See it transformed in seconds.", img: "/images/hero-after.jpg" },
];
