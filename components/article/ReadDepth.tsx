"use client";

import { useEffect } from "react";
import { captureEvent } from "@/lib/analytics";
import { bodyProgressPct, newDepths } from "@/lib/readDepth";

const BODY_SELECTOR = ".rr-article-body";
// A body that already fits on screen has every depth "reached" on load. Those
// only count once the reader scrolls, or after this long on the page.
const ARM_AFTER_MS = 3000;

/** Renders nothing. Fires `article_read_depth` {slug, type, depth, section} at
 *  25/50/75/100% of the article body (`.rr-article-body`, so the FAQ, CTAs and
 *  footer don't count), each at most once per pageview. `section` is the id of
 *  the last H2 whose top has passed the viewport top, null before the first. */
export default function ReadDepth({ slug, type }: { slug: string; type: string }) {
  useEffect(() => {
    const body = document.querySelector<HTMLElement>(BODY_SELECTOR);
    if (!body) return;
    const fired = new Set<number>();
    let frame = 0;

    function check() {
      frame = 0;
      if (!body) return;
      const rect = body.getBoundingClientRect();
      const pct = bodyProgressPct(rect.top, rect.height, window.innerHeight);
      const depths = newDepths(pct, fired);
      if (!depths.length) return;
      let section: string | null = null;
      for (const h of body.querySelectorAll<HTMLElement>("h2")) {
        if (h.getBoundingClientRect().top > 0) break;
        section = h.id || h.textContent?.trim() || null;
      }
      for (const depth of depths) {
        fired.add(depth);
        captureEvent("article_read_depth", { slug, type, depth, section });
      }
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(check);
    }
    const timer = window.setTimeout(() => {
      schedule();
    }, ARM_AFTER_MS);

    // Checks run only from a scroll or the timer, never on mount, so a short
    // body doesn't fire everything instantly.
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [slug, type]);

  return null;
}
