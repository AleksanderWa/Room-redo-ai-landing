import type { Metadata } from "next";
import Link from "next/link";
import ArticleCard from "@/components/article/ArticleCard";
import ArticleLayout from "@/components/article/ArticleLayout";
import Breadcrumb from "@/components/article/Breadcrumb";
import CtaBlock from "@/components/article/CtaBlock";
import JsonLd from "@/components/article/JsonLd";
import { getArticles } from "@/lib/content/load";
import { RSS_ALTERNATE, breadcrumbJsonLd } from "@/lib/content/seo";

const DESCRIPTION =
  "Plain advice on redesigning a room from a photo, written by the person who built the app.";

export function generateMetadata(): Metadata {
  const empty = getArticles("guides").length === 0;
  return {
    title: "Guides | Room Redo AI",
    description: DESCRIPTION,
    alternates: { canonical: "/guides", types: RSS_ALTERNATE },
    // Nothing to index until the first guide is published.
    ...(empty ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      url: "/guides",
      siteName: "Room Redo AI",
      title: "Guides | Room Redo AI",
      description: DESCRIPTION,
    },
    twitter: { card: "summary_large_image", title: "Guides | Room Redo AI", description: DESCRIPTION },
  };
}

export default function GuidesHub() {
  const articles = getArticles("guides");
  return (
    <ArticleLayout>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
        ])}
      />
      <Breadcrumb items={[{ name: "Home", href: "/" }, { name: "Guides" }]} />
      <h1 className="rr-article-h1 rr-article-h1--hub">Guides</h1>
      {articles.length === 0 ? (
        <p className="rr-article-intro">
          Guides are on the way. <Link href="/">Back to Room Redo AI</Link>
        </p>
      ) : (
        <>
          <p className="rr-article-intro">{DESCRIPTION}</p>
          <ul className="rr-article-list">
            {articles.map((a) => (
              <li key={a.slug}>
                <ArticleCard article={a} />
              </li>
            ))}
          </ul>
        </>
      )}
      <CtaBlock variant="end" placement="guides-hub" />
    </ArticleLayout>
  );
}
