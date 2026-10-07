"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  /** hero: inside the mockup's flat phone frame (bezel, dynamic island).
   *  storage: plain 3/4 rounded box, no frame; the parent sets its width. */
  heightVariant: "hero" | "storage";
  /** Above-the-fold images: load eagerly at high priority. Both halves are
   *  LCP candidates, so this is loading="eager" rather than `preload`. */
  eager?: boolean;
  /** next/image `sizes` override for the storage variant. */
  sizes?: string;
};

// pan-y, not none: the slider covers most of a mobile viewport, so a vertical
// swipe over it has to keep scrolling the page. Horizontal drags are claimed
// by preventDefault() once the gesture axis-locks — see onPointerMove.
const SURFACE: CSSProperties = {
  position: "absolute",
  inset: 0,
  touchAction: "pan-y",
  cursor: "ew-resize",
  userSelect: "none",
  WebkitTouchCallout: "none",
};

/** Touch travel (px) before a gesture is judged horizontal (drag) or vertical (scroll). */
const AXIS_LOCK_PX = 6;

/** Arrow-key step for keyboard users, in percent. */
const KEY_STEP = 5;

// Screen width inside the bezel: 340 - 2*12 from tablet up, 300 - 2*11 below.
const HERO_IMAGE_SIZES = "(min-width: 700px) 316px, 278px";
const STORAGE_IMAGE_SIZES = "(min-width: 700px) 480px, 100vw";

function Chevrons() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--rr-ink)"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l-6 6 6 6" />
      <path d="M15 6l6 6-6 6" />
    </svg>
  );
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  heightVariant,
  eager = false,
  sizes,
}: Props) {
  const [pct, setPct] = useState(50);
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

    // Mouse/pen: no axis-lock needed, jump to the click straight away. Touch
    // must stay uncommitted here so a vertical swipe can still scroll.
    if (!isTouch) {
      e.preventDefault();
      updatePct(e.clientX);
    }
  }

  useEffect(() => detach, [detach]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = pct - KEY_STEP;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = pct + KEY_STEP;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    if (next === null) return;
    e.preventDefault();
    setPct(Math.max(0, Math.min(100, next)));
  }

  const isHero = heightVariant === "hero";
  const imageSizes = isHero ? HERO_IMAGE_SIZES : (sizes ?? STORAGE_IMAGE_SIZES);
  const loading = eager ? "eager" : "lazy";
  const fetchPriority = eager ? "high" : undefined;

  const slider = (
    <div
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      role="slider"
      tabIndex={0}
      aria-label="Before and after comparison"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={`${Math.round(pct)}% before`}
      style={SURFACE}
    >
      <Image
        src={afterSrc}
        alt={afterAlt}
        fill
        loading={loading}
        fetchPriority={fetchPriority}
        sizes={imageSizes}
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
          loading={loading}
          fetchPriority={fetchPriority}
          sizes={imageSizes}
          style={{ objectFit: "cover" }}
          draggable={false}
        />
      </div>

      <span className="rr-ba-pill rr-ba-pill--before" aria-hidden="true">
        Before
      </span>
      <span className="rr-ba-pill rr-ba-pill--after" aria-hidden="true">
        After
      </span>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${pct}%`,
          width: 2,
          marginLeft: -1,
          background: "var(--rr-cream)",
          pointerEvents: "none",
        }}
      >
        <div className="rr-ba-handle">
          <Chevrons />
        </div>
      </div>
    </div>
  );

  if (!isHero) return <div className="rr-plain-frame">{slider}</div>;

  // Hero: the mockup's flat phone frame. Width (300px mobile, 340px from
  // tablet up) comes from .rr-phone in globals.css.
  return (
    <div className="rr-phone">
      <div className="rr-phone-screen">
        {slider}
        <div className="rr-phone-island" aria-hidden="true" />
      </div>
    </div>
  );
}
