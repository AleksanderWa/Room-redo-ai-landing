import Link from "next/link";
import { WORDMARK } from "@/lib/brandWordmark";

/** The Nola Home wordmark (traced from the app icon, see
 * scripts/trace-wordmark.mjs), linking home. Inline SVG in currentColor, so it
 * takes the ink colour of its context. Used by the homepage header/footer and
 * the legal and article pages. Height steps up at 700px via .rr-brand-mark in
 * globals.css. */
export default function Brand() {
  return (
    <Link href="/" aria-label="Nola Home, home page" className="rr-brand">
      <svg
        viewBox={WORDMARK.viewBox}
        role="img"
        aria-label="Nola Home"
        className="rr-brand-mark"
        style={{ aspectRatio: WORDMARK.ratio }}
      >
        <path fill="currentColor" d={WORDMARK.path} />
      </svg>
    </Link>
  );
}
