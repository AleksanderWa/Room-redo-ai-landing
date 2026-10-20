import Image from "next/image";
import AiPill from "@/components/article/AiPill";

/** One tile of `:::looks`. Every look is an AI redesign and carries the pill;
 *  the Before tile does not, and its caption says "Before" instead. */
export default function LookTile({ kind, src, alt, label }: { kind: "before" | "look"; src: string; alt: string; label: string }) {
  return (
    <div className={`rr-article-look rr-article-look--${kind}`}>
      <div className="rr-article-look-media">
        <Image src={src} alt={alt} fill sizes="(min-width:700px) 160px, 50vw" style={{ objectFit: "cover" }} />
        {kind === "look" && <AiPill className="rr-article-pill--small" />}
      </div>
      <span className="rr-article-look-name">{label}</span>
    </div>
  );
}
