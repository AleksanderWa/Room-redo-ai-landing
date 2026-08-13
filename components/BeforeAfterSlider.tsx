"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  /** hero: wrapped in an iPhone-style device frame (see design-assets/iphone-frame-spec.md
   *  for the safe-area geometry). storage: plain 3/4 rounded box, no frame. */
  heightVariant: "hero" | "storage";
  /** Only the hero slider shows the "drag to reveal" hint, per the source design. */
  showHint?: boolean;
  /** Hero images are the LCP element and should load eagerly. */
  priority?: boolean;
};

// Safe-area geometry for the hero device frame (public/images/iphone-frame.svg,
// viewBox 1148x1988, uniform 34-unit bezel, concentric corners: outer r 184,
// inner/screen r 150). Percentages below are the screen rect as a fraction
// of the outer device box, matching the SVG's inner corner radius exactly.
const HERO_SAFE_AREA: CSSProperties = {
  position: "absolute",
  left: "2.962%",
  top: "1.710%",
  width: "94.077%",
  height: "96.579%",
  borderRadius: "13.89% / 7.81%",
  overflow: "hidden",
  // pan-y, not none: the phone covers most of a mobile viewport, so a vertical
  // swipe over it has to keep scrolling the page. Horizontal drags are claimed
  // by preventDefault() once the gesture axis-locks — see onPointerMove.
  touchAction: "pan-y",
  cursor: "ew-resize",
  userSelect: "none",
  WebkitTouchCallout: "none",
  background: "#ddd",
};

const STORAGE_CONTAINER: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "3/4",
  maxHeight: 460,
  overflow: "hidden",
  borderRadius: 16,
  touchAction: "pan-y",
  cursor: "ew-resize",
  userSelect: "none",
  WebkitTouchCallout: "none",
  background: "#ddd",
};

/** Touch travel (px) before a gesture is judged horizontal (drag) or vertical (scroll). */
const AXIS_LOCK_PX = 6;

const HERO_IMAGE_SIZES = "(min-width: 1100px) 470px, (min-width: 700px) 380px, 340px";
const STORAGE_IMAGE_SIZES = "(min-width: 1100px) 1040px, (min-width: 700px) 640px, 100vw";

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
  const [hinted, setHinted] = useState(false);
  // Drag state lives in a ref, not state: the move/up handlers below are native
  // listeners registered once per drag, so they must not read stale closures.
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    rect: DOMRect;
    /** Touch gestures only count as a drag once they axis-lock horizontally. */
    committed: boolean;
  } | null>(null);

  const updatePct = useCallback((clientX: number) => {
    const r = drag.current?.rect;
    if (!r || r.width === 0) return;
    let p = ((clientX - r.left) / r.width) * 100;
    p = Math.max(0, Math.min(100, p));
    setPct(p);
  }, []);

  // Holds the removeEventListener closure built when the drag started, so
  // detach() doesn't have to reference the handlers that reference it.
  const cleanup = useRef<(() => void) | null>(null);

  const detach = useCallback(() => {
    drag.current = null;
    cleanup.current?.();
    cleanup.current = null;
  }, []);

  const onPointerMove = useCallback(
    (e: globalThis.PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;

      if (!d.committed) {
        const dx = Math.abs(e.clientX - d.startX);
        const dy = Math.abs(e.clientY - d.startY);
        if (dx < AXIS_LOCK_PX && dy < AXIS_LOCK_PX) return;
        // Vertical intent wins: bow out and let the page scroll.
        if (dy > dx) {
          detach();
          return;
        }
        d.committed = true;
      }

      // Once committed, claim the gesture so the browser can't reinterpret it
      // as a scroll and fire pointercancel mid-drag.
      if (e.cancelable) e.preventDefault();
      updatePct(e.clientX);
    },
    [detach, updatePct],
  );

  const onPointerEnd = useCallback(
    (e: globalThis.PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      // A touch that never axis-locked is a tap: jump the divider to it. Only on
      // a real pointerup though — pointercancel means iOS took the gesture for a
      // scroll, and jumping the divider as the page scrolls away is not a tap.
      if (!d.committed && e.type === "pointerup") updatePct(e.clientX);
      detach();
    },
    [detach, updatePct],
  );

  // iOS safety net: pointerup is not always delivered after a touch gesture.
  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      const d = drag.current;
      if (!d) return;
      if (!d.committed) updatePct(e.changedTouches[0]?.clientX ?? d.startX);
      detach();
    },
    [detach, updatePct],
  );

  // Deliberately NOT setPointerCapture + React synthetic move/up handlers: on
  // WebKit, capturing a *touch* pointer reports success but then stops
  // delivering pointermove/pointerup once the contact point leaves the element
  // (WebKit bug 220196), so the drag died on the first frame on iOS. Binding to
  // `document` for the life of the gesture is what react-compare-slider does and
  // it works everywhere — and the drag now keeps tracking when the finger
  // wanders outside the phone frame.
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if (drag.current) detach();

    const isTouch = e.pointerType === "touch";
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      // Cached once so the move handler doesn't force a layout read per frame.
      rect: e.currentTarget.getBoundingClientRect(),
      committed: !isTouch,
    };

    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerEnd);
    document.addEventListener("pointercancel", onPointerEnd);
    document.addEventListener("touchend", onTouchEnd);
    cleanup.current = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerEnd);
      document.removeEventListener("pointercancel", onPointerEnd);
      document.removeEventListener("touchend", onTouchEnd);
    };

    if (showHint) setHinted(true);

    // Mouse/pen: no axis-lock needed, jump to the click straight away. Touch
    // must stay uncommitted here so a vertical swipe can still scroll.
    if (!isTouch) {
      e.preventDefault();
      updatePct(e.clientX);
    }
  }

  useEffect(() => detach, [detach]);

  const isHero = heightVariant === "hero";
  const pillInset = isHero ? 16 : 14;

  const slider = (
    <div onPointerDown={onPointerDown} style={isHero ? HERO_SAFE_AREA : STORAGE_CONTAINER}>
      <Image
        src={afterSrc}
        alt={afterAlt}
        fill
        priority={priority}
        sizes={isHero ? HERO_IMAGE_SIZES : STORAGE_IMAGE_SIZES}
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
          sizes={isHero ? HERO_IMAGE_SIZES : STORAGE_IMAGE_SIZES}
          style={{ objectFit: "cover" }}
          draggable={false}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: pillInset,
          left: pillInset,
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
          top: pillInset,
          right: pillInset,
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
              bottom: 26,
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

  if (!isHero) return slider;

  // Hero: wrap the slider (the safe area) in the iPhone-style device frame.
  // Sizing (min(88vw,340px) → 380px → 470px) comes from the .rr-phone CSS
  // class in globals.css; this component just fills that width.
  return (
    <div className="rr-phone" style={{ position: "relative" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1148 / 1988",
          filter: "drop-shadow(0 26px 46px rgba(60,38,22,0.26))",
        }}
      >
        {slider}
        <img
          src="/images/iphone-frame.svg"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
