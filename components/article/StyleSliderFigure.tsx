"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import AiPill from "@/components/article/AiPill";
import type { ArticleContext } from "@/components/DownloadCta";
import { captureEvent } from "@/lib/analytics";
import {
  ARTICLE_IMAGE_QUALITY,
  aspectRatioOf,
  orientationOf,
  sizesFor,
  type ImageDims,
} from "@/lib/content/imageLayout";


export type StyleLook = { src: string; alt: string; title: string };

/** `:::style-slider`: one before photo, several AI looks, a chip per look. The
 *  reader taps a chip and drags the divider themselves. The first look is the
 *  one shown on load. */
export default function StyleSliderFigure({
  before,
  beforeAlt,
  caption,
  looks,
  dims,
  article,
}: {
  before: string;
  beforeAlt: string;
  caption?: string;
  looks: StyleLook[];
  /** Pixel size of the before photo (read at build time); sets the frame shape. */
  dims: ImageDims;
  article?: ArticleContext;
}) {
  const [active, setActive] = useState(0);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);

  const lead = caption ? `${caption.trim().replace(/[.!?]+$/, "")}. ` : "";
  const provenance = caption
    ? `${lead}Redesigned in the Room Redo app.`
    : "Before and after, redesigned in the Room Redo app.";

  function select(i: number) {
    if (i === active) return;
    setActive(i);
    captureEvent("article_style_chip_click", {
      slug: article?.slug ?? null,
      type: article?.type ?? null,
      style: looks[i].title,
      position: i,
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const n = looks.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (active + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (active - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    select(next);
    chips.current[next]?.focus();
  }

  return (
    <figure className={`rr-article-ba rr-article-ba--${orientationOf(dims)}`}>
      <div className="rr-article-ba-frame">
        <BeforeAfterSlider
          beforeSrc={before}
          beforeAlt={beforeAlt}
          afters={looks}
          activeIndex={active}
          heightVariant="storage"
          sizes={sizesFor(dims)}
          aspectRatio={aspectRatioOf(dims)}
          quality={ARTICLE_IMAGE_QUALITY}
          label={`Before and after: ${looks[active].title}`}
        />
        {/* Bottom-right (after side, never on the real before photo), the same text for every look. */}
        <AiPill className="rr-article-pill--small" />
      </div>
      <div className="rr-article-ba-chips" role="radiogroup" aria-label="Pick a style" onKeyDown={onKeyDown}>
        {looks.map((look, i) => (
          <button
            key={look.title}
            ref={(el) => {
              chips.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={i === active}
            tabIndex={i === active ? 0 : -1}
            className="rr-article-ba-chip"
            onClick={() => select(i)}
          >
            {look.title}
          </button>
        ))}
      </div>
      <figcaption>{provenance}</figcaption>
    </figure>
  );
}
