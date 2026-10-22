/** How an article image is laid out, derived from the file's real size. Pure
 *  (no fs), so the rules are unit-testable; the file read lives in imageSize.ts. */

export type ImageDims = { width: number; height: number };

/** next/image quality for article images. Must be listed in
 *  `images.qualities` in next.config.ts (Next 16 coerces anything else). */
export const ARTICLE_IMAGE_QUALITY = 90;

/** Article column is 720px with 24px gutters: 672px of content from 720px up,
 *  full width minus gutters below. */
const COLUMN_PX = 672;
/** Portrait frames stay narrower so a tall image does not fill the screen. */
const PORTRAIT_MAX_PX = 480;
const GUTTERS = "calc(100vw - 48px)";

export type Orientation = "landscape" | "portrait";

export function orientationOf({ width, height }: ImageDims): Orientation {
  return width > height ? "landscape" : "portrait";
}

/** CSS `aspect-ratio` value ("1600 / 1200") for a frame that shows the whole image. */
export function aspectRatioOf({ width, height }: ImageDims): string {
  return `${width} / ${height}`;
}

/** next/image `sizes` for a frame that fills its column (landscape) or is
 *  capped at 480px (portrait). It equals the real rendered CSS width, so the
 *  browser picks a variant of at least rendered width x DPR. */
export function sizesFor(dims: ImageDims): string {
  return orientationOf(dims) === "landscape"
    ? `(min-width:720px) ${COLUMN_PX}px, ${GUTTERS}`
    : `(min-width:${PORTRAIT_MAX_PX + 48}px) ${PORTRAIT_MAX_PX}px, ${GUTTERS}`;
}

/** Hero is full-bleed on a phone (no gutters), so below 720px it is 100vw. */
export function heroSizesFor(dims: ImageDims): string {
  return orientationOf(dims) === "landscape"
    ? `(min-width:720px) ${COLUMN_PX}px, 100vw`
    : `(min-width:${PORTRAIT_MAX_PX}px) ${PORTRAIT_MAX_PX}px, 100vw`;
}

/** Fallback when a file cannot be sized (should not happen; build fails first). */
export const DEFAULT_PORTRAIT: ImageDims = { width: 3, height: 4 };
