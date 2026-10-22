import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import AiPill from "@/components/article/AiPill";

import { readImageSize } from "@/lib/content/imageSize";
import {
  ARTICLE_IMAGE_QUALITY,
  aspectRatioOf,
  orientationOf,
  sizesFor,
} from "@/lib/content/imageLayout";

export default function BeforeAfterFigure({
  before,
  after,
  beforeAlt,
  afterAlt,
  caption,
}: {
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
  caption?: string;
}) {
  // The before photo sets the shape; after is a redesign of the same photo.
  const dims = readImageSize(before);
  const lead = caption ? `${caption.trim().replace(/[.!?]+$/, "")}. ` : "";
  const provenance = caption
    ? `${lead}Redesigned in the Room Redo app.`
    : "Before and after, redesigned in the Room Redo app.";
  return (
    <figure className={`rr-article-ba rr-article-ba--${orientationOf(dims)}`}>
      <div className="rr-article-ba-frame">
        <BeforeAfterSlider
          beforeSrc={before}
          afterSrc={after}
          beforeAlt={beforeAlt}
          afterAlt={afterAlt}
          heightVariant="storage"
          sizes={sizesFor(dims)}
          aspectRatio={aspectRatioOf(dims)}
          quality={ARTICLE_IMAGE_QUALITY}
          label={caption ? `Before and after: ${caption}` : undefined}
        />
        {/* Bottom-right (after side, never on the real before photo); the Before/After pills own the top corners. */}
        <AiPill className="rr-article-pill--small" />
      </div>
      <figcaption>{provenance}</figcaption>
    </figure>
  );
}
