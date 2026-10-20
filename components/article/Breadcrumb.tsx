import Link from "next/link";

export type Crumb = { name: string; href?: string };

/** Visual breadcrumb; the last item is the current page. The matching
 *  BreadcrumbList JSON-LD is emitted by the page. */
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="rr-article-crumbs">
      <ol>
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.name} className={last ? "rr-article-crumb-current" : undefined}>
              {last || !it.href ? (
                <span aria-current={last ? "page" : undefined}>{it.name}</span>
              ) : (
                <Link href={it.href}>{it.name}</Link>
              )}
              {!last && (
                <span aria-hidden="true" className="rr-article-crumb-sep">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
