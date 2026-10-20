"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import DownloadCta, { type ArticleContext } from "@/components/DownloadCta";

/**
 * Mobile-only App Store bar. Shown once the first-screen badge has scrolled
 * away, and hidden whenever any in-flow CTA ([data-rr-cta]) is on screen, so
 * it never covers one. One IntersectionObserver watches them all.
 */
export default function StickyCta({
  campaign,
  article,
}: {
  campaign: string;
  article: ArticleContext;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ctas = Array.from(document.querySelectorAll<HTMLElement>("[data-rr-cta]"));
    if (ctas.length === 0) return;
    const top = document.querySelector<HTMLElement>('[data-rr-cta="top"]');
    const onScreen = new Set<Element>();

    const update = () => {
      // Past the top badge: it has left through the top of the viewport.
      const pastTop = top ? top.getBoundingClientRect().bottom < 0 : window.scrollY > 0;
      setVisible(pastTop && onScreen.size === 0);
    };

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) onScreen.add(e.target);
        else onScreen.delete(e.target);
      }
      update();
    });
    ctas.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`rr-article-sticky${visible ? " rr-article-sticky--visible" : ""}`}
      aria-hidden={!visible}
    >
      <div className="rr-article-sticky-inner">
        <Image
          src="/images/brand-icon.png"
          alt=""
          width={36}
          height={36}
          className="rr-article-sticky-icon"
        />
        <div className="rr-article-sticky-text">
          <span className="rr-article-sticky-name">Room Redo AI</span>
          <span className="rr-article-sticky-sub">iPhone app</span>
        </div>
        <DownloadCta placement="article-sticky" campaign={campaign} article={article} />
      </div>
    </div>
  );
}
