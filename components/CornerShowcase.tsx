"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { getImageProps } from "next/image";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import type { CornerResult } from "@/data/corners";

// Same `sizes` for the slider and the preload, so the preload picks the same
// srcset candidate the slider will request.
const SIZES = "(min-width: 700px) 480px, 100vw";

/** After this long without the new image, the slider shows a busy state. */
const BUSY_DELAY_MS = 150;

// One load promise per image URL, shared by hover/focus preloads and
// selection, so the slider's own <img> is a cache hit when it swaps.
const loads = new Map<string, Promise<void>>();

function load(result: CornerResult): Promise<void> {
  let p = loads.get(result.img);
  if (!p) {
    const { props } = getImageProps({ src: result.img, alt: "", fill: true, sizes: SIZES });
    p = new Promise<void>((resolve) => {
      const img = new window.Image();
      // Resolve on error too: the swap must not hang on a failed request.
      img.onload = img.onerror = () => resolve();
      if (props.sizes) img.sizes = props.sizes;
      if (props.srcSet) img.srcset = props.srcSet;
      img.src = props.src;
    });
    loads.set(result.img, p);
  }
  return p;
}

type Props = {
  before: { img: string; alt: string };
  results: CornerResult[];
  defaultId: string;
  eyebrow: string;
};

/**
 * The corners section's interactive part: purpose chips (one radio group:
 * the "Make it usable" purposes, then "or", then "Surprise me") and one
 * before/after slider whose "after" is the selected result. Renders two grid
 * children, .rr-corners-chips and .rr-corners-media (placed by the
 * .rr-corners grid in globals.css).
 *
 * Selecting a chip marks it checked at once, but the slider keeps showing
 * the previous result (image, alt, caption) until the new image has loaded,
 * then swaps all three together; a slow load shows a subtle busy state. The
 * slider stays mounted, so the divider keeps its position.
 */
export default function CornerShowcase({ before, results, defaultId, eyebrow }: Props) {
  const initial = Math.max(0, results.findIndex((r) => r.id === defaultId));
  const [selected, setSelected] = useState(initial);
  const [shown, setShown] = useState(initial);
  const [busy, setBusy] = useState(false);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const request = useRef(0);
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (busyTimer.current) clearTimeout(busyTimer.current);
    },
    []
  );

  if (results.length === 0) return null;
  const current = results[shown];

  function select(i: number, focus: boolean) {
    setSelected(i);
    if (focus) chips.current[i]?.focus();

    const token = ++request.current;
    if (busyTimer.current) clearTimeout(busyTimer.current);
    busyTimer.current = setTimeout(() => {
      if (request.current === token) setBusy(true);
    }, BUSY_DELAY_MS);

    load(results[i]).then(() => {
      if (request.current !== token) return; // a later selection won
      if (busyTimer.current) clearTimeout(busyTimer.current);
      setShown(i);
      setBusy(false);
    });
  }

  // Radio-group keys: arrows move (and select), wrapping; Home/End jump.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const n = results.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (selected + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (selected - 1 + n) % n;
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
        aria-checked={i === selected}
        tabIndex={i === selected ? 0 : -1}
        className="rr-chip"
        onClick={() => select(i, false)}
        onPointerEnter={() => void load(r)}
        onFocus={() => void load(r)}
      >
        {r.label}
      </button>
    );
  }

  // One row: the "Make it usable" chips, then "or", then "Surprise me". Chip
  // (and arrow-key) order is the results order, surprise last.
  const indexed = results.map((r, i) => ({ r, i }));
  const usable = indexed.filter(({ r }) => r.group === "usable");
  const surprise = indexed.filter(({ r }) => r.group === "surprise");

  return (
    <>
      <div
        className="rr-corners-chips"
        role="radiogroup"
        aria-label="Corner ideas"
        onKeyDown={onKeyDown}
      >
        <span className="rr-corner-kicker" aria-hidden="true">
          {eyebrow}
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

      <div
        className={`rr-corners-media${busy ? " rr-corners-media--busy" : ""}`}
        aria-busy={busy}
      >
        <BeforeAfterSlider
          beforeSrc={before.img}
          afterSrc={current.img}
          beforeAlt={before.alt}
          afterAlt={current.alt}
          heightVariant="storage"
          sizes={SIZES}
        />
        <p className="rr-corners-caption" aria-live="polite">
          {current.caption}
        </p>
      </div>
    </>
  );
}
