import Image from "next/image";
import type { CSSProperties } from "react";
import { styleById } from "@/data/styles";

// Decorative "saved pins" around the tension headline ("You've saved 400
// rooms on Pinterest…"). Every thumb is the same bedroom, which is the point.
// Static on purpose. Layout lives in globals.css (.rr-pins*):
//   - mobile and tablet: a cropped strip above the text and one below
//     (4 pins each on mobile, 5 on tablet);
//   - desktop: two flanking column pairs, centre left as plain sand.
// Pins are never faded beside the text, only at the section's top/bottom
// edges. Hidden layouts use display:none, so their lazy images never load.

type Shape = "short" | "std" | "tall" | "xtall";

type PinSpec = {
  id: string;
  shape: Shape;
  tilt: number;
  saved?: "bottom" | "top";
  // Tablet-only fifth strip pin.
  wideOnly?: boolean;
  // Mobile strips only: staggered edge facing the text.
  marginTop?: number;
  marginBottom?: number;
};

// Desktop columns, outer-left to outer-right; the centre grid track is empty.
// Offsets (globals.css) and heights are sized so four pins cover the
// section at 1100px (narrowest pins, ~111px); the fifth keeps columns going
// when zoom or larger text makes the section taller. Pins that fall below
// the section clip are never requested, so it costs nothing at normal sizes. Pills only on inner columns:
// the outer ones crop at the viewport edge between 1100 and 1180px.
const WALL: { cls: string; pins: PinSpec[] }[] = [
  {
    cls: "rr-pins-col rr-pins-col--1",
    pins: [
      { id: "tropical_resort", shape: "tall", tilt: -2.5 },
      { id: "industrial", shape: "xtall", tilt: 2 },
      { id: "english_country", shape: "std", tilt: -2 },
      { id: "blush_jacuzzi_spa", shape: "tall", tilt: 2.5 },
      { id: "rustic_cabin", shape: "std", tilt: -2 },
    ],
  },
  {
    cls: "rr-pins-col rr-pins-col--2",
    pins: [
      { id: "scandinavian", shape: "std", tilt: 2 },
      { id: "soft_parisian", shape: "xtall", tilt: -3, saved: "bottom" },
      { id: "library_nook", shape: "tall", tilt: 2.5 },
      { id: "art_deco", shape: "tall", tilt: -2 },
      { id: "organic_modern", shape: "xtall", tilt: 2.5 },
    ],
  },
  {
    cls: "rr-pins-col rr-pins-col--3",
    pins: [
      { id: "japandi", shape: "short", tilt: -3 },
      { id: "dark_luxury", shape: "xtall", tilt: 2, saved: "bottom" },
      { id: "mediterranean", shape: "tall", tilt: -2.5 },
      { id: "coastal", shape: "xtall", tilt: 2 },
      { id: "timeless_classic", shape: "std", tilt: -2.5 },
    ],
  },
  {
    cls: "rr-pins-col rr-pins-col--4",
    pins: [
      { id: "bohemian", shape: "xtall", tilt: 3 },
      { id: "urban_jungle_corner", shape: "tall", tilt: -2 },
      { id: "seventies_retro", shape: "xtall", tilt: 2.5 },
      { id: "mid_century_modern", shape: "std", tilt: -2 },
      { id: "farmhouse", shape: "tall", tilt: 2 },
    ],
  },
];

const STRIP_TOP: PinSpec[] = [
  { id: "urban_jungle_corner", shape: "std", tilt: -2, marginBottom: 0 },
  { id: "soft_parisian", shape: "tall", tilt: 3, marginBottom: 18, saved: "bottom" },
  { id: "dark_luxury", shape: "xtall", tilt: -2.5, marginBottom: 6 },
  { id: "coastal", shape: "std", tilt: 2, marginBottom: 24 },
  { id: "bohemian", shape: "tall", tilt: -2, marginBottom: 10, wideOnly: true },
];

const STRIP_BOTTOM: PinSpec[] = [
  { id: "seventies_retro", shape: "tall", tilt: 2.5, marginTop: 14 },
  { id: "mediterranean", shape: "std", tilt: -2, marginTop: 0, saved: "top" },
  { id: "art_deco", shape: "xtall", tilt: 2, marginTop: 22 },
  { id: "japandi", shape: "std", tilt: -3, marginTop: 8 },
  { id: "library_nook", shape: "tall", tilt: 2.5, marginTop: 18, wideOnly: true },
];

const WALL_SIZES = "180px";
const STRIP_SIZES = "(min-width: 700px) 150px, 116px";

function Pin({ pin, sizes }: { pin: PinSpec; sizes: string }) {
  const style = styleById(pin.id);
  const css: CSSProperties = { transform: `rotate(${pin.tilt}deg)` };
  if (pin.marginTop !== undefined) css.marginTop = pin.marginTop;
  if (pin.marginBottom !== undefined) css.marginBottom = pin.marginBottom;

  return (
    <div
      className={`rr-pin rr-pin--${pin.shape}${pin.wideOnly ? " rr-pin--wide-only" : ""}`}
      style={css}
    >
      <Image
        src={style.thumb}
        alt=""
        fill
        sizes={sizes}
        fetchPriority="low"
        style={{ objectFit: "cover", objectPosition: "50% 60%" }}
      />
      {pin.saved && (
        <span className={`rr-pin-saved${pin.saved === "top" ? " rr-pin-saved--top" : ""}`}>
          <svg
            viewBox="0 0 10 12"
            width="9"
            height="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          >
            <path d="M1.5 1.2h7v9.6L5 8.4 1.5 10.8Z" />
          </svg>
          Saved
        </span>
      )}
    </div>
  );
}

export default function PinMosaic() {
  return (
    <div className="rr-pins" aria-hidden="true">
      <div className="rr-pins-strip rr-pins-strip--top">
        {STRIP_TOP.map((p) => (
          <Pin key={p.id} pin={p} sizes={STRIP_SIZES} />
        ))}
      </div>
      <div className="rr-pins-wall">
        {WALL.map((col) => (
          <div key={col.cls} className={col.cls}>
            {col.pins.map((p) => (
              <Pin key={p.id} pin={p} sizes={WALL_SIZES} />
            ))}
          </div>
        ))}
      </div>
      <div className="rr-pins-strip rr-pins-strip--bottom">
        {STRIP_BOTTOM.map((p) => (
          <Pin key={p.id} pin={p} sizes={STRIP_SIZES} />
        ))}
      </div>
    </div>
  );
}
