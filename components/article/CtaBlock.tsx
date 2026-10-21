import Image from "next/image";
import DownloadCta, { type ArticleContext, type Placement } from "@/components/DownloadCta";
import type { HubPlacement } from "@/lib/content/sections";

/** In-flow App Store block. `mid` is compact and left aligned; `end` is the
 *  closing block (centered, with the app icon). Marked data-rr-cta so the
 *  sticky bar knows when one is on screen. */
export default function CtaBlock({
  variant = "mid",
  title,
  text,
  placement,
  campaign,
  article,
}: {
  variant?: "mid" | "end";
  title?: string;
  text?: string;
  placement?: Extract<Placement, "article-mid" | "article-end" | "author"> | HubPlacement;
  campaign?: string;
  article?: ArticleContext;
}) {
  const isEnd = variant === "end";
  const place = placement ?? (isEnd ? "article-end" : "article-mid");
  // No exact style count: the catalogue grows (content/_system/FACTS.md).
  const heading = title ?? (isEnd ? "Redesign your room from a photo" : "Try it on your own room");
  const body =
    text ??
    (isEnd
      ? "Room Redo is an iPhone app. Take a photo, pick a style, and see your own room redesigned."
      : "Take one photo and see it redesigned in more than 45 styles. Your first redesign is free.");

  return (
    <aside
      data-rr-cta=""
      aria-label="Get Room Redo"
      className={`rr-article-cta ${isEnd ? "rr-article-cta--end" : "rr-article-cta--mid"}`}
    >
      {isEnd && (
        <Image
          src="/images/brand-icon.png"
          alt=""
          width={56}
          height={56}
          className="rr-article-cta-icon"
        />
      )}
      <div className="rr-article-cta-title">{heading}</div>
      <div className="rr-article-cta-text">{body}</div>
      <DownloadCta placement={place} campaign={campaign} article={article} />
    </aside>
  );
}
