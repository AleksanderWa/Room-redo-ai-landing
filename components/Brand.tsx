import Image from "next/image";
import Link from "next/link";

/** The Room Redo mark (app icon + spaced serif wordmark), linking home.
 * Used by the homepage header/footer and the legal pages. Sizes step up at
 * 700px via .rr-brand* in globals.css. */
export default function Brand() {
  return (
    <Link href="/" aria-label="Room Redo home" className="rr-brand">
      <Image
        src="/images/brand-icon.png"
        alt=""
        width={28}
        height={28}
        className="rr-brand-icon"
      />
      <span className="rr-brand-word">Room Redo</span>
    </Link>
  );
}
