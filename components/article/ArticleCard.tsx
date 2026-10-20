import Image from "next/image";
import Link from "next/link";
import AiPill from "@/components/article/AiPill";
import { articlePath, formatDate, type Article } from "@/lib/content/load";

/** Hub / related card. The title link is stretched over the whole card, so
 *  there is one tab stop and one link name. */
export default function ArticleCard({
  article,
  compact = false,
}: {
  article: Article;
  compact?: boolean;
}) {
  const meta = compact
    ? `${article.readMinutes} min read`
    : `${formatDate(article.datePublished)} · ${article.readMinutes} min read`;
  return (
    <article className={`rr-article-card${compact ? " rr-article-card--compact" : ""}`}>
      <div className="rr-article-card-media">
        <Image
          src={article.hero.src}
          alt=""
          fill
          sizes="(min-width:720px) 240px, calc(100vw - 48px)"
          style={{ objectFit: "cover" }}
        />
        {article.hero.isAiRedesign && <AiPill className="rr-article-pill--card" />}
      </div>
      <div className="rr-article-card-text">
        <h2 className="rr-article-card-title">
          <Link href={articlePath(article)}>{article.title}</Link>
        </h2>
        {!compact && <p className="rr-article-card-desc">{article.description}</p>}
        <p className="rr-article-card-meta">{meta}</p>
      </div>
    </article>
  );
}
