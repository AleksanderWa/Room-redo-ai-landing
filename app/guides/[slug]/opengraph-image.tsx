import { notFound } from "next/navigation";
import { getArticle, getArticles } from "@/lib/content/load";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/content/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Room Redo AI guide";

export function generateStaticParams() {
  return getArticles("guides").map((a) => ({ slug: a.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle("guides", slug);
  if (!article) notFound();
  return ogCard({
    title: article.title,
    heroSrc: article.hero.src,
    withBadges: article.hero.isAiRedesign,
  });
}
