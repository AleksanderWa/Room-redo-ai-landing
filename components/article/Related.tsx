import ArticleCard from "@/components/article/ArticleCard";
import type { Article } from "@/lib/content/load";

/** "Keep reading". Renders nothing at all when the list is empty. */
export default function Related({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="rr-related-heading" className="rr-article-related">
      <h2 id="rr-related-heading">Keep reading</h2>
      <ul>
        {articles.map((a) => (
          <li key={a.slug}>
            <ArticleCard article={a} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
