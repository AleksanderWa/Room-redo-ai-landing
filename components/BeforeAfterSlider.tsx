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
  /** A single after image (hero, `::before-after`). Ignored when `afters` is given. */
  afterSrc?: string;
  beforeAlt: string;
  afterAlt?: string;
  /** Several after images stacked in one frame (`:::style-slider`); only
   *  `activeIndex` is visible and exposed to assistive tech. */
  afters?: { src: string; alt: string }[];
  activeIndex?: number;
  /** hero: inside the mockup's flat phone frame (bezel, dynamic island).
   *  storage: plain 3/4 rounded box, no frame; the parent sets its width. */
  heightVariant: "hero" | "storage";
  /** Above-the-fold images: load eagerly at high priority. Both halves are
   *  LCP candidates, so this is loading="eager" rather than `preload`. */
  eager?: boolean;
  /** next/image `sizes` override for the storage variant. */
  sizes?: string;
  /** Accessible name of the comparison group. Give pages with several
   *  sliders distinct ones. */
  label?: string;
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

/** Divider position (percent) at or beyond which a look change re-centres it. */
const RESET_AT_PCT = 95;

/** Arrow-key step for keyboard users, in percent. */
const KEY_STEP = 5;

// Screen width inside the bezel: 340 - 2*12 from tablet up, 300 - 2*11 below.
// The hero screen is 9:19.5 (278px / 316px wide) but the images are 9:16
// with object-fit: cover, so they render at screen height x 9/16: ~339px
// and ~386px wide. `sizes` is that rendered width, not the screen width.
const HERO_IMAGE_SIZES = "(min-width: 700px) 386px, 339px";
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
  afters,
  activeIndex = 0,
  heightVariant,
  eager = false,
  sizes,
  label = "Before and after comparison",
}: Props) {
  const [pct, setPct] = useState(50);
  // A reader parked on "all before" who picks another look would see nothing
  // change, so the divider goes back to the middle. Adjusted during render
  // (the React-sanctioned way to react to a prop change), not in an effect.
  const [seenIndex, setSeenIndex] = useState(activeIndex);
  if (seenIndex !== activeIndex) {
    setSeenIndex(activeIndex);
    if (pct >= RESET_AT_PCT) setPct(50);
  }
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
  const afterList = afters ?? [{ src: afterSrc ?? "", alt: afterAlt ?? "" }];

  const slider = (
    // The surface is a labelled group, so both images keep their alt text
    // for screen readers; the slider role (value + keys) lives on the handle.
    // Pointer dragging stays on the whole surface.
    <div
      onPointerDown={onPointerDown}
      role="group"
      aria-label={label}
      style={SURFACE}
    >
      {/* The after images are stacked and crossfaded (see .rr-ba-after in
          globals.css); the before clip below sits above them all. */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {afterList.map((a, i) => (
          <div
            key={a.src}
            className={`rr-ba-after${i === activeIndex ? " rr-ba-after--active" : ""}`}
            aria-hidden={i === activeIndex ? undefined : true}
          >
            <Image
              src={a.src}
              alt={a.alt}
              fill
              loading={loading}
              fetchPriority={fetchPriority}
              sizes={imageSizes}
              style={{ objectFit: "cover" }}
              draggable={false}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 ${100 - pct}% 0 0)`,
          zIndex: 1,
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
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${pct}%`,
          width: 2,
          marginLeft: -1,
          background: "var(--rr-cream)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        <div
          className="rr-ba-handle"
          role="slider"
          tabIndex={0}
          aria-label="Before and after divider"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-valuetext={`${Math.round(pct)}% before`}
          onKeyDown={onKeyDown}
          style={{ pointerEvents: "auto" }}
        >
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
