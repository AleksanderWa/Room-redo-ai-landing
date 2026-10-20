import { renderInlineMarkdown } from "@/lib/content/render";
import { FAQ_MIN } from "@/lib/content/schema";

/** The collapsed FAQ after the body. Native <details>, all closed: the answers
 *  are in the HTML for crawlers and find-in-page, and no JS is needed. Renders
 *  nothing under FAQ_MIN items. No FAQPage JSON-LD on purpose (Google dropped
 *  FAQ rich results). */
export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  if (items.length < FAQ_MIN) return null;
  return (
    <section className="rr-article-faq" aria-labelledby="faq-title">
      <h2 id="faq-title" className="rr-article-faq-title">Quick questions</h2>
      <div className="rr-article-faq-list">
        {items.map((item) => (
          <details key={item.q} className="rr-article-faq-item">
            <summary>
              <span className="rr-article-faq-q">{item.q}</span>
              <span className="rr-article-faq-chev" aria-hidden="true">
                <span />
              </span>
            </summary>
            <div className="rr-article-faq-a">{renderInlineMarkdown(item.a)}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
