"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import type { StyleCard } from "@/data/styles";

const CORMORANT = "var(--font-cormorant), 'Cormorant Garamond', serif";

// Distance to advance per arrow click: one card + its gap.
const SCROLL_STEP = 158 + 14;

const arrowStyle: CSSProperties = {
  position: "absolute",
  top: "38%",
  transform: "translateY(-50%)",
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "1px solid rgba(44,40,36,0.1)",
  background: "rgba(247,242,234,0.92)",
  color: "#2C2824",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(30,26,22,0.14)",
  transition: "opacity 0.15s",
};

export default function StyleCarousel({ styles }: { styles: StyleCard[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  // The container's left padding + scroll-snap-align:start on the first
  // card mean the browser's own resting scrollLeft is the padding width,
  // not 0 — capture that natural minimum once so "can scroll left" is
  // judged against it instead of an absolute (and wrong) zero.
  const restingScrollLeft = useRef<number | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [dragging, setDragging] = useState(false);

  function updateArrowVisibility() {
    const el = scrollerRef.current;
    if (!el) return;
    if (restingScrollLeft.current === null) restingScrollLeft.current = el.scrollLeft;
    setCanScrollPrev(el.scrollLeft > restingScrollLeft.current + 4);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateArrowVisibility();
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateArrowVisibility();
    const onResize = () => updateArrowVisibility();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  function scrollByStep(direction: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
  }

  // Drag-to-scroll for mouse users only — touch keeps native scrolling.
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const el = scrollerRef.current;
    if (!el || !dragState.current) return;
    el.scrollLeft = dragState.current.startScrollLeft - (e.clientX - dragState.current.startX);
  }

  function endDrag() {
    dragState.current = null;
    setDragging(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={scrollerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          padding: "4px 24px 8px",
          scrollSnapType: dragging ? "none" : "x mandatory",
          WebkitOverflowScrolling: "touch",
          cursor: dragging ? "grabbing" : "grab",
        }}
      >
        {styles.map((s, i) => (
          <div
            key={s.num}
            style={{ flex: "0 0 auto", width: 158, scrollSnapAlign: "start" }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "3/4",
                borderRadius: 14,
                overflow: "hidden",
                background: "#e5ddd2",
              }}
            >
              <Image
                src={s.img}
                alt={s.name}
                fill
                {...(i === 0 ? { priority: true } : { loading: "lazy" })}
                sizes="158px"
                draggable={false}
                style={{ objectFit: "cover" }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  fontFamily: CORMORANT,
                  fontSize: 15,
                  color: "#fff",
                  background: "rgba(30,26,22,0.5)",
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {s.num}
              </span>
            </div>
            <p
              style={{
                margin: "9px 2px 0",
                fontSize: 14,
                fontWeight: 500,
                color: "#2C2824",
              }}
            >
              {s.name}
            </p>
          </div>
        ))}
      </div>

      {canScrollPrev && (
        <button
          type="button"
          aria-label="Scroll styles left"
          onClick={() => scrollByStep(-1)}
          style={{ ...arrowStyle, left: 6 }}
        >
          ‹
        </button>
      )}
      {canScrollNext && (
        <button
          type="button"
          aria-label="Scroll styles right"
          onClick={() => scrollByStep(1)}
          style={{ ...arrowStyle, right: 6 }}
        >
          ›
        </button>
      )}
    </div>
  );
}
