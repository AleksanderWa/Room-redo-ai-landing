import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AiPill from "@/components/article/AiPill";
import ArticleLayout from "@/components/article/ArticleLayout";
import AuthorBox from "@/components/article/AuthorBox";
import Breadcrumb from "@/components/article/Breadcrumb";
import CtaBlock from "@/components/article/CtaBlock";
import Faq from "@/components/article/Faq";
import JsonLd from "@/components/article/JsonLd";
import Related from "@/components/article/Related";
import DownloadCta from "@/components/DownloadCta";
import { getAuthor } from "@/lib/content/authors";
import { formatDate, getArticle, getArticles, getRelated } from "@/lib/content/load";
import { renderArticleBody } from "@/lib/content/render";
import { articleJsonLd, articleMetadata } from "@/lib/content/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getArticles("guides").map((a) => ({ slug: a.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle("guides", slug);
  if (!article) return {};
  return articleMetadata(article, getAuthor(article.author));
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle("guides", slug);
  if (!article) notFound();

  const author = getAuthor(article.author);
  const campaign = article.campaign.ct;
  const ctx = { slug: article.slug, type: article.type };
  const updated = article.dateModified !== article.datePublished;
  const shownDate = updated ? article.dateModified : article.datePublished;
  const faq = <Faq items={article.faq} />;
  const where = `content/${article.type}/${article.slug}.md`;

  return (
    <ArticleLayout sticky={article.stickyCta ? { campaign, article: ctx } : undefined}>
      <JsonLd data={articleJsonLd(article, author)} />
      <Breadcrumb
        items={[
          { name: "Home", href: "/" },
          { name: "Guides", href: "/guides" },
          { name: article.title },
        ]}
      />
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

        <figure className="rr-article-hero">
          <div className="rr-article-hero-media">
            <Image
              src={article.hero.src}
              alt={article.hero.alt}
              fill
              preload
              fetchPriority="high"
              sizes="(min-width:720px) 672px, 100vw"
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

        <div className="rr-article-body">
          {renderArticleBody(article.body, where, { ...ctx, campaign }, faq)}
        </div>

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
