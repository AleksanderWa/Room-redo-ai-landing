"use client";

import { useEffect } from "react";
import { captureEvent } from "@/lib/analytics";
import { READ_DEPTHS, bodyProgressPct, newDepths, sectionAtDepth } from "@/lib/readDepth";

/** Renders nothing. Fires `article_read_depth` {slug, type, depth, section} at
 *  25/50/75/100% of the article's own prose, each at most once per pageview.
 *  The measured range runs from `[data-rr-read-start]` to `[data-rr-read-end]`
 *  (see ReadMarker): the prose only, never the FAQ, the end CTA or the footer,
 *  on every article. CTAs inside the range (the mid `::cta`, `[data-rr-cta]`)
 *  are excluded too: their height is removed from both the scrolled px and the
 *  total, so moving the mid CTA doesn't shift the percentages. `section` is the id of the H2 the reader was in when that
 *  depth was reached (per depth, so a jump to the bottom doesn't credit 25 and
 *  50 to the last section), null before the first H2.
 *
 *  Fires only on scroll. A body that fits on screen without scrolling fires
 *  nothing: no scroll means no evidence of reading. */
export default function ReadDepth({ slug, type }: { slug: string; type: string }) {
  useEffect(() => {
    const start = document.querySelector<HTMLElement>("[data-rr-read-start]");
    const end = document.querySelector<HTMLElement>("[data-rr-read-end]");
    if (!start || !end) return;
    const body = document.querySelector<HTMLElement>(".rr-article-body");
    const fired = new Set<number>();
    let frame = 0;

    function check() {
      frame = 0;
      if (!start || !end) return;
      const top = start.getBoundingClientRect().top;
      const height = end.getBoundingClientRect().top - top;
      const excluded = Array.from(start.ownerDocument.querySelectorAll<HTMLElement>("[data-rr-cta]"), (el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, height: r.height };
      });
      const depths = newDepths(bodyProgressPct(top, height, window.innerHeight, excluded), fired);
      if (!depths.length) return;
      const h2s = Array.from(body?.querySelectorAll<HTMLElement>("h2") ?? [], (h) => ({
        id: h.id || h.textContent?.trim() || "",
        top: h.getBoundingClientRect().top,
      }));
      for (const depth of depths) {
        fired.add(depth);
        const section = sectionAtDepth(h2s, depth, top, height, window.innerHeight, excluded) || null;
        captureEvent("article_read_depth", { slug, type, depth, section });
      }
      if (fired.size === READ_DEPTHS.length) window.removeEventListener("scroll", schedule);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(check);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [slug, type]);

  return null;
}
