import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticlePage from "@/components/article/ArticlePage";
import { getAuthor } from "@/lib/content/authors";
import { getArticle, getArticles } from "@/lib/content/load";
import { articleMetadata } from "@/lib/content/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getArticles("ideas").map((a) => ({ slug: a.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle("ideas", slug);
  if (!article) return {};
  return articleMetadata(article, getAuthor(article.author));
}

export default async function IdeaPage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle("ideas", slug);
  if (!article) notFound();
  return <ArticlePage article={article} />;
}
