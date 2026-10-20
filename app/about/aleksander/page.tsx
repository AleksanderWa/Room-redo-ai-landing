import type { Metadata } from "next";
import Link from "next/link";
import Avatar from "@/components/article/Avatar";
import ArticleLayout from "@/components/article/ArticleLayout";
import Breadcrumb from "@/components/article/Breadcrumb";
import CtaBlock from "@/components/article/CtaBlock";
import JsonLd from "@/components/article/JsonLd";
import { authorPhoto, getAuthor } from "@/lib/content/authors";
import { formatDate, getArticles } from "@/lib/content/load";
import { renderArticleBody } from "@/lib/content/render";
import { RSS_ALTERNATE, authorJsonLd } from "@/lib/content/seo";

export function generateMetadata(): Metadata {
  const author = getAuthor("aleksander");
  const title = `${author.name} | Room Redo AI`;
  return {
    title,
    description: author.summary,
    alternates: { canonical: author.path, types: RSS_ALTERNATE },
    openGraph: {
      type: "profile",
      url: author.path,
      siteName: "Room Redo AI",
      title,
      description: author.summary,
    },
    twitter: { card: "summary_large_image", title, description: author.summary },
  };
}

export default function AuthorPage() {
  const author = getAuthor("aleksander");
  const articles = getArticles("guides").filter((a) => a.author === author.id);
  return (
    <ArticleLayout>
      <JsonLd data={authorJsonLd(author)} />
      <Breadcrumb items={[{ name: "Home", href: "/" }, { name: author.name }]} />
      <header className="rr-article-profile">
        <Avatar name={author.name} photo={authorPhoto(author.id)} size={96} className="rr-article-avatar--profile" />
        <div>
          <h1 className="rr-article-h1 rr-article-h1--profile">{author.name}</h1>
          <p className="rr-article-profile-role">{author.role}</p>
        </div>
      </header>

      <div className="rr-article-body rr-article-body--profile">
        {renderArticleBody(author.bio, `content/authors/${author.id}.md`, {
          slug: author.id,
          type: "author",
          campaign: "author",
        })}
      </div>

      {author.links.length > 0 && (
        <ul className="rr-article-links">
          {author.links.map((l) => (
            <li key={l.url}>
              <a href={l.url} rel="noopener">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}

      {articles.length > 0 && (
        <section aria-labelledby="rr-by-author" className="rr-article-byauthor">
          <h2 id="rr-by-author">Guides by {author.name}</h2>
          <ul>
            {articles.map((a) => (
              <li key={a.slug}>
                <Link href={`/${a.type}/${a.slug}`}>
                  <span className="rr-article-byauthor-title">{a.title}</span>
                  <span className="rr-article-byauthor-date">{formatDate(a.datePublished)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CtaBlock variant="end" placement="author" />
    </ArticleLayout>
  );
}
