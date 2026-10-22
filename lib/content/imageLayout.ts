/** How an article image is laid out, derived from the file's real size. Pure
 *  (no fs), so the rules are unit-testable; the file read lives in imageSize.ts. */

export type ImageDims = { width: number; height: number };

/** next/image quality for article images. Must be listed in
 *  `images.qualities` in next.config.ts (Next 16 coerces anything else). */
export const ARTICLE_IMAGE_QUALITY = 90;

/** CSS breakpoints these `sizes` mirror (app/globals.css):
 *  - `.rr-article` is max 720px wide (`--rr-measure`).
 *  - `.rr-article-inner` pads 24px per side below 700px and 32px from 700px.
 *  - A portrait body image (`.rr-article-fig--portrait`) is capped at 480px at
 *    every width; a portrait hero is capped at 480px only from 700px up.
 *  - The hero is full-bleed (no gutters) below 700px. */
const BP_PX = 700;
const MEASURE_PX = 720;
const GUTTER_NARROW_PX = 24;
const GUTTER_WIDE_PX = 32;
/** Content width from 720px up: 720 - 2 x 32. */
const COLUMN_PX = MEASURE_PX - 2 * GUTTER_WIDE_PX;
/** Portrait frames stay narrower so a tall image does not fill the screen. */
const PORTRAIT_MAX_PX = 480;
const NARROW = `calc(100vw - ${2 * GUTTER_NARROW_PX}px)`;
const MID = `calc(100vw - ${2 * GUTTER_WIDE_PX}px)`;

export type Orientation = "landscape" | "portrait";

export function orientationOf({ width, height }: ImageDims): Orientation {
  return width > height ? "landscape" : "portrait";
}

/** CSS `aspect-ratio` value ("1600 / 1200") for a frame that shows the whole image. */
export function aspectRatioOf({ width, height }: ImageDims): string {
  return `${width} / ${height}`;
}

/** next/image `sizes` for a body image: it equals the real rendered CSS width,
 *  so the browser picks a variant of at least rendered width x DPR. Landscape
 *  fills the column; portrait is capped at 480px (as soon as the column is
 *  wider than that, i.e. from 480 + 2 x 24 = 528px). */
export function sizesFor(dims: ImageDims): string {
  return orientationOf(dims) === "landscape"
    ? `(min-width:${MEASURE_PX}px) ${COLUMN_PX}px, (min-width:${BP_PX}px) ${MID}, ${NARROW}`
    : `(min-width:${PORTRAIT_MAX_PX + 2 * GUTTER_NARROW_PX}px) ${PORTRAIT_MAX_PX}px, ${NARROW}`;
}

/** Hero is full-bleed on a phone (no gutters), so below 700px it is 100vw. The
 *  portrait cap applies from the same 700px breakpoint, not from 480px. */
export function heroSizesFor(dims: ImageDims): string {
  return orientationOf(dims) === "landscape"
    ? `(min-width:${MEASURE_PX}px) ${COLUMN_PX}px, (min-width:${BP_PX}px) ${MID}, 100vw`
    : `(min-width:${BP_PX}px) ${PORTRAIT_MAX_PX}px, 100vw`;
}
