import Image from "next/image";
import Link from "next/link";
import AiPill from "@/components/article/AiPill";
import ArticleLayout from "@/components/article/ArticleLayout";
import AuthorBox from "@/components/article/AuthorBox";
import Breadcrumb from "@/components/article/Breadcrumb";
import CtaBlock from "@/components/article/CtaBlock";
import Faq from "@/components/article/Faq";
import JsonLd from "@/components/article/JsonLd";
import ReadDepth from "@/components/article/ReadDepth";
import ReadMarker from "@/components/article/ReadMarker";
import Related from "@/components/article/Related";
import DownloadCta from "@/components/DownloadCta";
import { getAuthor } from "@/lib/content/authors";
import { formatDate, getRelated, type Article } from "@/lib/content/load";
import { readImageSize } from "@/lib/content/imageSize";
import {
  ARTICLE_IMAGE_QUALITY,
  aspectRatioOf,
  heroSizesFor,
  orientationOf,
} from "@/lib/content/imageLayout";
import { renderArticleBody } from "@/lib/content/render";
import { SECTIONS } from "@/lib/content/sections";
import { articleJsonLd } from "@/lib/content/seo";

/** Shared page body for /guides/<slug> and /ideas/<slug>. */
export default function ArticlePage({ article }: { article: Article }) {
  const author = getAuthor(article.author);
  const campaign = article.campaign.ct;
  const ctx = { slug: article.slug, type: article.type };
  const updated = article.dateModified !== article.datePublished;
  const shownDate = updated ? article.dateModified : article.datePublished;
  const heroDims = readImageSize(article.hero.src);
  const faq = <Faq items={article.faq} />;
  const where = `content/${article.type}/${article.slug}.md`;

  return (
    <ArticleLayout sticky={article.stickyCta ? { campaign, article: ctx } : undefined}>
      <JsonLd data={articleJsonLd(article, author)} />
      <Breadcrumb
        items={[
          { name: "Home", href: "/" },
          { name: SECTIONS[article.type].label, href: SECTIONS[article.type].path },
          { name: article.title },
        ]}
      />
      <ReadDepth slug={article.slug} type={article.type} />
      <article>
        <h1 className="rr-article-h1">{article.title}</h1>
        <p className="rr-article-meta">
          By{" "}
          <Link href={author.path} className="rr-article-meta-author">
            {author.name}
          </Link>{" "}
          · <time dateTime={shownDate}>{updated ? "Updated " : ""}{formatDate(shownDate)}</time> ·{" "}
          {article.readMinutes} min read
        </p>

        <div data-rr-cta="top" className="rr-article-top-cta">
          <DownloadCta placement="article-top" campaign={campaign} article={ctx} />
          <p>iPhone app. Your first redesign is free.</p>
        </div>

        <figure className={`rr-article-hero rr-article-hero--${orientationOf(heroDims)}`}>
          <div className="rr-article-hero-media" style={{ aspectRatio: aspectRatioOf(heroDims) }}>
            <Image
              src={article.hero.src}
              alt={article.hero.alt}
              fill
              preload
              fetchPriority="high"
              sizes={heroSizesFor(heroDims)}
              quality={ARTICLE_IMAGE_QUALITY}
              style={{ objectFit: "cover" }}
            />
            {article.hero.isAiRedesign && <AiPill className="rr-article-pill--hero" />}
          </div>
          {(article.heroCaption || article.hero.isAiRedesign) && (
            <figcaption>
              {article.heroCaption ?? "A real room, redesigned in the Room Redo app."}
            </figcaption>
          )}
        </figure>

        <ReadMarker edge="start" />
        <div className="rr-article-body">
          {renderArticleBody(article.body, where, { ...ctx, campaign }, faq)}
        </div>
        {!article.hasEndCta && <ReadMarker edge="end" />}

        {/* The FAQ sits after the body and before the end CTA, whether the CTA
            is the layout's default or the body's own last block. */}
        {!article.hasEndCta && (
          <>
            {faq}
            <CtaBlock variant="end" placement="article-end" campaign={campaign} article={ctx} />
          </>
        )}
        <AuthorBox author={author} />
        <Related articles={getRelated(article)} />
      </article>
    </ArticleLayout>
  );
}
