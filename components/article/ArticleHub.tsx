import type { Metadata } from "next";
import Link from "next/link";
import ArticleCard from "@/components/article/ArticleCard";
import ArticleLayout from "@/components/article/ArticleLayout";
import Breadcrumb from "@/components/article/Breadcrumb";
import CtaBlock from "@/components/article/CtaBlock";
import JsonLd from "@/components/article/JsonLd";
import { getArticles } from "@/lib/content/load";
import type { ArticleType } from "@/lib/content/schema";
import { SECTIONS } from "@/lib/content/sections";
import { RSS_ALTERNATE, breadcrumbJsonLd } from "@/lib/content/seo";

/** Metadata for a hub. `index: false` while the section has nothing to list. */
export function hubMetadata(type: ArticleType): Metadata {
  const { label, path, description } = SECTIONS[type];
  const title = `${label} | Room Redo AI`;
  const empty = getArticles(type).length === 0;
  return {
    title,
    description,
    alternates: { canonical: path, types: RSS_ALTERNATE },
    ...(empty ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: "website", url: path, siteName: "Room Redo AI", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ArticleHub({ type }: { type: ArticleType }) {
  const { label, path, description, empty, hubPlacement } = SECTIONS[type];
  const articles = getArticles(type);
  return (
    <ArticleLayout>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: label, path },
        ])}
      />
      <Breadcrumb items={[{ name: "Home", href: "/" }, { name: label }]} />
      <h1 className="rr-article-h1 rr-article-h1--hub">{label}</h1>
      {articles.length === 0 ? (
        <p className="rr-article-intro">
          {empty} <Link href="/">Back to Room Redo AI</Link>
        </p>
      ) : (
        <>
          <p className="rr-article-intro">{description}</p>
          <ul className="rr-article-list">
            {articles.map((a) => (
              <li key={a.slug}>
                <ArticleCard article={a} />
              </li>
            ))}
          </ul>
        </>
      )}
      <CtaBlock variant="end" placement={hubPlacement} />
    </ArticleLayout>
  );
}
