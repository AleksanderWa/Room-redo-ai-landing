import Image from "next/image";
import AiPill from "@/components/article/AiPill";
import { splitImageTitle } from "@/lib/content/image";
import { readImageSize } from "@/lib/content/imageSize";
import { ARTICLE_IMAGE_QUALITY, orientationOf, sizesFor } from "@/lib/content/imageLayout";

/** A markdown image. Dimensions are read from the file at build time so the
 *  page does not shift and the image is never cropped. Every body image is a
 *  Room Redo output unless proven otherwise, so it gets the AI redesign pill;
 *  a real photo opts out with the title "photo" (`![alt](src "photo")`). Any
 *  other title becomes the visible caption. */
export default function ArticleImage({
  src,
  alt,
  title,
}: {
  src: string;
  alt: string;
  title?: string;
}) {
  const { isPhoto, caption } = splitImageTitle(title);
  const dims = readImageSize(src);
  return (
    <figure className={`rr-article-fig rr-article-fig--${orientationOf(dims)}`}>
      <div className="rr-article-fig-media">
        <Image
          src={src}
          alt={alt}
          width={dims.width}
          height={dims.height}
          sizes={sizesFor(dims)}
          quality={ARTICLE_IMAGE_QUALITY}
          loading="lazy"
        />
        {!isPhoto && <AiPill />}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
