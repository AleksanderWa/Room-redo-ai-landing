export const READ_DEPTHS = [25, 50, 75, 100] as const;
export type ReadDepth = (typeof READ_DEPTHS)[number];

/** A block (a CTA) whose height must not count toward reading depth. Viewport
 *  coordinates, as from getBoundingClientRect. */
export type ExcludedBlock = { top: number; height: number };

/** Excluded blocks clipped to the range, empty ones dropped, in top order. */
function clipBlocks(rangeTop: number, rangeHeight: number, blocks: ReadonlyArray<ExcludedBlock>): ExcludedBlock[] {
  const rangeBottom = rangeTop + rangeHeight;
  const out: ExcludedBlock[] = [];
  for (const b of blocks) {
    const top = Math.max(b.top, rangeTop);
    const bottom = Math.min(b.top + b.height, rangeBottom);
    if (bottom > top) out.push({ top, height: bottom - top });
  }
  return out.sort((x, y) => x.top - y.top);
}

/** Height of the range with the excluded blocks taken out: the 100% denominator. */
export function contentHeight(rangeTop: number, rangeHeight: number, blocks: ReadonlyArray<ExcludedBlock>): number {
  let h = rangeHeight;
  for (const b of clipBlocks(rangeTop, rangeHeight, blocks)) h -= b.height;
  return Math.max(0, h);
}

/** Share (0-100) of the range's own content the reader has reached: the
 *  viewport's bottom edge measured against the range's top and height, with
 *  every excluded block (mid CTA) removed from both the px scrolled past and
 *  the total. Blocks fully above the viewport bottom subtract their whole
 *  height; one the viewport bottom sits inside subtracts the part above it.
 *  All rects are viewport-relative (getBoundingClientRect), so no scroll
 *  offset is needed. */
export function bodyProgressPct(
  rangeTop: number,
  rangeHeight: number,
  viewportHeight: number,
  excluded: ReadonlyArray<ExcludedBlock> = [],
): number {
  const total = contentHeight(rangeTop, rangeHeight, excluded);
  if (!(total > 0)) return 0;
  let reached = viewportHeight - rangeTop;
  for (const b of clipBlocks(rangeTop, rangeHeight, excluded)) {
    reached -= Math.max(0, Math.min(viewportHeight, b.top + b.height) - b.top);
  }
  return Math.max(0, Math.min(100, (reached / total) * 100));
}

/** Depths newly crossed at `pct` that are not already in `fired`, ascending. */
export function newDepths(pct: number, fired: ReadonlySet<number>): ReadDepth[] {
  // Epsilon so a body ending exactly at the viewport bottom counts as 100.
  return READ_DEPTHS.filter((d) => pct >= d - 0.5 && !fired.has(d));
}

/** Section (H2 id) the reader was in when the viewport bottom sat at depth `d`
 *  of the range's content (excluded blocks removed, same coordinate system as
 *  bodyProgressPct). The content position `d/100 * contentHeight` is mapped back
 *  to a viewport-bottom position by adding the heights of the excluded blocks
 *  above it; the viewport top is `viewportHeight` above that. Returns the last
 *  H2 at or above that point, null before the first. `h2s` must be in document
 *  order, viewport coordinates. */
export function sectionAtDepth(
  h2s: ReadonlyArray<{ id: string; top: number }>,
  depth: number,
  rangeTop: number,
  rangeHeight: number,
  viewportHeight: number,
  excluded: ReadonlyArray<ExcludedBlock> = [],
): string | null {
  const c = (depth / 100) * contentHeight(rangeTop, rangeHeight, excluded);
  let skipped = 0;
  for (const b of clipBlocks(rangeTop, rangeHeight, excluded)) {
    if (c > b.top - rangeTop - skipped) skipped += b.height;
    else break;
  }
  const viewTop = rangeTop + c + skipped - viewportHeight;
  let section: string | null = null;
  for (const h of h2s) {
    if (h.top > viewTop) break;
    section = h.id;
  }
  return section;
}
