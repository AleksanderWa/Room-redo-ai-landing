export const READ_DEPTHS = [25, 50, 75, 100] as const;
export type ReadDepth = (typeof READ_DEPTHS)[number];

/** Share (0-100) of the article body the reader has reached: the viewport's
 *  bottom edge measured against the body's top and height. Both rects are
 *  viewport-relative (getBoundingClientRect), so no scroll offset is needed. */
export function bodyProgressPct(bodyTop: number, bodyHeight: number, viewportHeight: number): number {
  if (!(bodyHeight > 0)) return 0;
  const pct = ((viewportHeight - bodyTop) / bodyHeight) * 100;
  return Math.max(0, Math.min(100, pct));
}

/** Depths newly crossed at `pct` that are not already in `fired`, ascending. */
export function newDepths(pct: number, fired: ReadonlySet<number>): ReadDepth[] {
  // Epsilon so a body ending exactly at the viewport bottom counts as 100.
  return READ_DEPTHS.filter((d) => pct >= d - 0.5 && !fired.has(d));
}

/** Section (H2 id) the reader was in when the viewport bottom sat at depth `d`
 *  of the measured range. Viewport coordinates, as from getBoundingClientRect:
 *  the viewport bottom is at `rangeTop + d/100 * rangeHeight`, so its top is
 *  `viewportHeight` above that. Returns the last H2 at or above that point,
 *  null before the first. `h2s` must be in document order. */
export function sectionAtDepth(
  h2s: ReadonlyArray<{ id: string; top: number }>,
  depth: number,
  rangeTop: number,
  rangeHeight: number,
  viewportHeight: number,
): string | null {
  const viewTop = rangeTop + (depth / 100) * rangeHeight - viewportHeight;
  let section: string | null = null;
  for (const h of h2s) {
    if (h.top > viewTop) break;
    section = h.id;
  }
  return section;
}
