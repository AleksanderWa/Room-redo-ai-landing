"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { getImageProps } from "next/image";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import {
  CORNER_BEFORE,
  CORNER_DEFAULT_ID,
  CORNER_GROUPS,
  CORNER_RESULTS,
  type CornerResult,
} from "@/data/corners";

// Same `sizes` for the slider and the hover/focus preload, so the preload
// picks the same srcset candidate the slider will request.
const SIZES = "(min-width: 700px) 480px, 100vw";

const DEFAULT_INDEX = Math.max(
  0,
  CORNER_RESULTS.findIndex((r) => r.id === CORNER_DEFAULT_ID)
);

const preloaded = new Set<string>();

function preload(result: CornerResult) {
  if (preloaded.has(result.img)) return;
  preloaded.add(result.img);
  const { props } = getImageProps({ src: result.img, alt: "", fill: true, sizes: SIZES });
  const img = new window.Image();
  if (props.sizes) img.sizes = props.sizes;
  if (props.srcSet) img.srcset = props.srcSet;
  img.src = props.src;
}

/**
 * The corners section's interactive part: purpose chips (a radio group, in
 * the app's two groups) and one before/after slider whose "after" is the
 * selected result. Renders two grid children: .rr-corners-chips and
 * .rr-corners-media (placed by the .rr-corners grid in globals.css).
 *
 * The slider stays mounted across switches, so the divider keeps its
 * position; only the selected result is ever requested, the others are
 * preloaded on chip hover or focus.
 */
export default function CornerShowcase() {
  const [index, setIndex] = useState(DEFAULT_INDEX);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = CORNER_RESULTS[index];

  function select(i: number, focus: boolean) {
    setIndex(i);
    if (focus) chips.current[i]?.focus();
  }

  // Radio-group keys: arrows move (and select), wrapping; Home/End jump.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const n = CORNER_RESULTS.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    select(next, true);
  }

  return (
    <>
      <div
        className="rr-corners-chips"
        role="radiogroup"
        aria-label="Corner ideas"
        onKeyDown={onKeyDown}
      >
        {CORNER_GROUPS.map((group) => {
          const items = CORNER_RESULTS.map((r, i) => ({ r, i })).filter(
            ({ r }) => r.group === group.id
          );
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="rr-corners-chip-group">
              <span className="rr-corner-kicker" aria-hidden="true">
                {group.label}
              </span>
              <div className="rr-corners-chip-row">
                {items.map(({ r, i }) => (
                  <button
                    key={r.id}
                    ref={(el) => {
                      chips.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={i === index}
                    tabIndex={i === index ? 0 : -1}
                    className="rr-chip"
                    onClick={() => select(i, false)}
                    onPointerEnter={() => preload(r)}
                    onFocus={() => preload(r)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rr-corners-media">
        <BeforeAfterSlider
          beforeSrc={CORNER_BEFORE.img}
          afterSrc={selected.img}
          beforeAlt={CORNER_BEFORE.alt}
          afterAlt={selected.alt}
          heightVariant="storage"
          sizes={SIZES}
        />
        <p className="rr-corners-caption" aria-live="polite">
          {selected.caption}
        </p>
      </div>
    </>
  );
}
