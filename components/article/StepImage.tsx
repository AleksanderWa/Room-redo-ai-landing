import Image from "next/image";
import AiPill from "@/components/article/AiPill";
import { splitImageTitle } from "@/lib/content/image";

/** The optional picture in a `:::steps` card. An app output carries the AI
 *  redesign pill; the title "photo" turns it off, as for any body image. */
export default function StepImage({ src, alt, title }: { src: string; alt: string; title?: string }) {
  const { isPhoto } = splitImageTitle(title);
  return (
    <div className="rr-article-step-img">
      <Image src={src} alt={alt} fill sizes="(min-width:700px) 360px, 260px" style={{ objectFit: "cover" }} />
      {!isPhoto && <AiPill className="rr-article-pill--small" />}
    </div>
  );
}
