import Image from "next/image";
import { styleAlt, styleById } from "@/data/styles";
import { parseStyleTexts } from "@/lib/content/directives";
import AiPill from "@/components/article/AiPill";

// The shared label for a row (the spec allows a caption instead of per-thumb pills).
const ROW_CAPTION = "AI redesigns of the same bedroom, made in the Room Redo app.";

/** `::style-card`. One id: a horizontal card with the AI redesign pill. Two
 *  to four: a grid of thumbs with one shared caption. Not clickable (there
 *  are no style pages yet). */
export default function StyleCards({ ids, text }: { ids: string[]; text?: string }) {
  const texts = parseStyleTexts(text ? { text } : {}, ids);
  const list = ids.map(styleById);

  if (list.length === 1) {
    const style = list[0];
    return (
      <figure className="rr-article-stylecard">
        <div className="rr-article-stylecard-thumb">
          <Image src={style.thumb} alt={styleAlt(style)} fill sizes="120px" style={{ objectFit: "cover" }} />
          <AiPill className="rr-article-pill--small" />
        </div>
        <figcaption>
          <span className="rr-eyebrow rr-article-stylecard-eyebrow">{style.section}</span>
          <span className="rr-article-stylecard-name">{style.name}</span>
          {texts[style.id] && <span className="rr-article-stylecard-text">{texts[style.id]}</span>}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="rr-article-stylerow-wrap">
      <div className={`rr-article-stylerow rr-article-stylerow--${list.length}`}>
        {list.map((style) => (
          <div key={style.id} className="rr-style-fig">
            <div className="rr-style-thumb">
              <Image
                src={style.thumb}
                alt={styleAlt(style)}
                fill
                sizes="(min-width:700px) 160px, 33vw"
                style={{ objectFit: "cover" }}
              />
            </div>
            <span className="rr-style-caption">{style.name}</span>
            {texts[style.id] && <span className="rr-article-stylerow-text">{texts[style.id]}</span>}
          </div>
        ))}
      </div>
      <figcaption>{ROW_CAPTION}</figcaption>
    </figure>
  );
}
