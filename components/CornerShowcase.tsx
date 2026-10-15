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

// One row: the "Make it usable" chips, then "or", then "Surprise me". Chip
// order (and arrow-key order) is CORNER_RESULTS order, surprise last.
const indexed = CORNER_RESULTS.map((r, i) => ({ r, i }));
const usable = indexed.filter(({ r }) => r.group === "usable");
const surprise = indexed.filter(({ r }) => r.group === "surprise");
const usableLabel = CORNER_GROUPS.find((g) => g.id === "usable")?.label ?? "";

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
 * The corners section's interactive part: purpose chips (one radio group:
 * the "Make it usable" purposes, then "or", then "Surprise me") and one
 * before/after slider whose "after" is the
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

  function chip(r: CornerResult, i: number) {
    return (
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
    );
  }

  return (
    <>
      <div
        className="rr-corners-chips"
        role="radiogroup"
        aria-label="Corner ideas"
        onKeyDown={onKeyDown}
      >
        <span className="rr-corner-kicker" aria-hidden="true">
          {usableLabel}
        </span>
        <div className="rr-corners-chip-row">
          {usable.map(({ r, i }) => chip(r, i))}
          {surprise.length > 0 && (
            // "or" + the surprise chip(s) wrap together, never apart.
            <span className="rr-corners-chip-or-group">
              <span className="rr-corners-chip-or" aria-hidden="true">
                or
              </span>
              {surprise.map(({ r, i }) => chip(r, i))}
            </span>
          )}
        </div>
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
