import Link from "next/link";
import type { ReactNode } from "react";
import Brand from "@/components/Brand";
import StickyCta from "@/components/article/StickyCta";
import type { ArticleContext } from "@/components/DownloadCta";

/** Shell for /guides, /guides/<slug> and /about/aleksander: the legal pages'
 *  reading column (a sibling of LegalLayout, which stays as it is), plus a
 *  skip link, a footer, and an optional mobile sticky App Store bar. */
export default function ArticleLayout({
  children,
  sticky,
}: {
  children: ReactNode;
  sticky?: { campaign: string; article: ArticleContext };
}) {
  return (
    <div className="rr-article-page">
      <a href="#main" className="rr-sr-only rr-article-skip">
        Skip to content
      </a>
      <div className={`rr-article${sticky ? " rr-article--sticky" : ""}`}>
        <header className="rr-article-brand">
          <Brand />
        </header>
        <div className="rr-article-inner">
          <main id="main">{children}</main>
          <footer className="rr-article-footer">
            <Link href="/">Room Redo AI</Link>
            <Link href="/guides">Guides</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </footer>
        </div>
      </div>
      {sticky && <StickyCta campaign={sticky.campaign} article={sticky.article} />}
    </div>
  );
}
