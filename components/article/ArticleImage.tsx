import path from "node:path";
import Image from "next/image";
import sharp from "sharp";
import AiPill from "@/components/article/AiPill";
import { splitImageTitle } from "@/lib/content/image";

/** A markdown image. Dimensions are read from the file at build time so the
 *  page does not shift. Every body image is a Room Redo output unless proven
 *  otherwise, so it gets the AI redesign pill; a real photo opts out with the
 *  title "photo" (`![alt](src "photo")`). Any other title becomes the visible
 *  caption. */
export default async function ArticleImage({
  src,
  alt,
  title,
}: {
  src: string;
  alt: string;
  title?: string;
}) {
  const { isPhoto, caption } = splitImageTitle(title);
  const file = path.join(process.cwd(), "public", src);
  const { width, height } = await sharp(file).metadata();
  if (!width || !height) throw new Error(`Cannot read the size of ${src}`);
  return (
    <figure className="rr-article-fig">
      <div className="rr-article-fig-media">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(min-width:720px) 672px, calc(100vw - 48px)"
          loading="lazy"
        />
        {!isPhoto && <AiPill />}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
