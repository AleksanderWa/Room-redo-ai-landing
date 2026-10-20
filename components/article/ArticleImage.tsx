import path from "node:path";
import Image from "next/image";
import sharp from "sharp";
import AiPill from "@/components/article/AiPill";

/** A markdown image. Dimensions are read from the file at build time so the
 *  page does not shift. Alt text beginning "AI redesign" (the house rule for
 *  app generations) gets the pill; a title (`![alt](src "caption")`) becomes
 *  the visible caption. */
export default async function ArticleImage({
  src,
  alt,
  title,
}: {
  src: string;
  alt: string;
  title?: string;
}) {
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
        {/^AI redesign/i.test(alt) && <AiPill />}
      </div>
      {title && <figcaption>{title}</figcaption>}
    </figure>
  );
}
