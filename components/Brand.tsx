import Image from "next/image";
import Link from "next/link";

/** The Nola Home lockup (masthead cropped from the app icon), linking home.
 * Used by the homepage header/footer and the legal and article pages. Height
 * steps up at 700px via .rr-brand-lockup in globals.css. The intrinsic
 * 360x180 lets Next serve the full-size file to 2x/3x screens (it never
 * enlarges past the source); quality 90 keeps the optimizer from softening it. */
export default function Brand() {
  return (
    <Link href="/" aria-label="Nola Home, home page" className="rr-brand">
      <Image
        src="/images/brand-lockup.png"
        alt="Nola Home"
        width={360}
        height={180}
        quality={90}
        className="rr-brand-lockup"
      />
    </Link>
  );
}
