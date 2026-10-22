import Image from "next/image";
import AiPill from "@/components/article/AiPill";
import { readImageSize } from "@/lib/content/imageSize";
import { ARTICLE_IMAGE_QUALITY, aspectRatioOf } from "@/lib/content/imageLayout";

/** One tile of `:::looks`. Every look is an AI redesign and carries the pill;
 *  the Before tile does not, and its caption says "Before" instead. */
export default function LookTile({ kind, src, alt, label }: { kind: "before" | "look"; src: string; alt: string; label: string }) {
  // Each tile takes its own image's shape and nothing is cropped. Tiles in one
  // row only line up when their images share a shape; authors should use one
  // shape per :::looks block (mixed shapes give different heights per tile).
  const aspectRatio = aspectRatioOf(readImageSize(src));
  return (
    <div className={`rr-article-look rr-article-look--${kind}`}>
      <div className="rr-article-look-media" style={{ aspectRatio }}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width:700px) 240px, 50vw"
          quality={ARTICLE_IMAGE_QUALITY}
          style={{ objectFit: "cover" }}
        />
        {kind === "look" && <AiPill className="rr-article-pill--small" />}
      </div>
      <span className="rr-article-look-name">{label}</span>
    </div>
  );
}
