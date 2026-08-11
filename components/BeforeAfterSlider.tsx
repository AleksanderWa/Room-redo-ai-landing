"use client";

import { useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  /** hero: 46vh (min 300 / max 430), flush edges. storage: 3/4 aspect, rounded, max-height 460. */
  heightVariant: "hero" | "storage";
  /** Only the hero slider shows the "drag to reveal" hint, per the source design. */
  showHint?: boolean;
  /** Hero images are the LCP element and should load eagerly. */
  priority?: boolean;
};

const containerStyleByVariant: Record<Props["heightVariant"], CSSProperties> = {
  hero: {
    position: "relative",
    width: "100%",
    height: "46vh",
    minHeight: 300,
    maxHeight: 430,
    overflow: "hidden",
    touchAction: "none",
    cursor: "ew-resize",
    userSelect: "none",
    background: "#ddd",
  },
  storage: {
    position: "relative",
    width: "100%",
    aspectRatio: "3/4",
    maxHeight: 460,
    overflow: "hidden",
    borderRadius: 16,
    touchAction: "none",
    cursor: "ew-resize",
    userSelect: "none",
    background: "#ddd",
  },
};

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  heightVariant,
  showHint = false,
  priority = false,
}: Props) {
  const [pct, setPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [hinted, setHinted] = useState(false);

  function updatePct(e: ReactPointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    let p = ((e.clientX - r.left) / r.width) * 100;
    p = Math.max(0, Math.min(100, p));
    setPct(p);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore — matches source's best-effort try/catch
    }
    setDragging(true);
    if (showHint) setHinted(true);
    updatePct(e);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragging) updatePct(e);
  }

  function onPointerUp() {
    if (dragging) setDragging(false);
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={containerStyleByVariant[heightVariant]}
    >
      <Image
        src={afterSrc}
        alt={afterAlt}
        fill
        priority={priority}
        sizes="(min-width: 460px) 460px, 100vw"
        style={{ objectFit: "cover" }}
        draggable={false}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 ${100 - pct}% 0 0)`,
        }}
      >
        <Image
          src={beforeSrc}
          alt={beforeAlt}
          fill
          priority={priority}
          sizes="(min-width: 460px) 460px, 100vw"
          style={{ objectFit: "cover" }}
          draggable={false}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          background: "rgba(30,26,22,0.55)",
          color: "#fff",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "5px 10px",
          borderRadius: 999,
          backdropFilter: "blur(2px)",
        }}
      >
        Before
      </div>
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          background: "rgba(255,255,255,0.82)",
          color: "#2C2824",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "5px 10px",
          borderRadius: 999,
        }}
      >
        After
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${pct}%`,
          width: 2,
          background: "rgba(255,255,255,0.95)",
          transform: "translateX(-1px)",
          boxShadow: "0 0 8px rgba(0,0,0,0.25)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 44,
            height: 44,
            borderRadius: 999,
            background: "#fff",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
          }}
        >
          <span style={{ color: "#2C2824", fontSize: 13, lineHeight: 1 }}>‹</span>
          <span style={{ color: "#2C2824", fontSize: 13, lineHeight: 1 }}>›</span>
        </div>
        {showHint && (
          <div
            style={{
              position: "absolute",
              bottom: 22,
              left: "50%",
              transform: "translateX(-50%)",
              opacity: hinted ? 0 : 1,
              transition: "opacity 0.4s",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                display: "inline-block",
                whiteSpace: "nowrap",
                background: "rgba(30,26,22,0.7)",
                color: "#fff",
                fontSize: 11,
                letterSpacing: "0.08em",
                padding: "5px 11px",
                borderRadius: 999,
                animation: "rr-nudge 1.6s ease-in-out infinite",
              }}
            >
              drag to reveal
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
