import Image from "next/image";
import Link from "next/link";

/** The Nola Home lockup (masthead cropped from the app icon), linking home.
 * Used by the homepage header/footer and the legal and article pages. Height
 * steps up at 700px via .rr-brand-lockup in globals.css. */
export default function Brand() {
  return (
    <Link href="/" aria-label="Nola Home, home page" className="rr-brand">
      <Image
        src="/images/brand-lockup.png"
        alt="Nola Home"
        width={120}
        height={60}
        className="rr-brand-lockup"
      />
    </Link>
  );
}
