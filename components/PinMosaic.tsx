import Image from "next/image";
import type { CSSProperties } from "react";
import { styles, type Style } from "@/data/styles";

// Decorative wall of "saved pins" behind the tension headline ("You've saved
// 400 rooms on Pinterest…"). Every thumb is the same bedroom, which is the
// point. Static on purpose: no drift or parallax behind the headline.
// Layout (7 columns desktop, 5 tablet, two cropped strips on mobile), the
// oval clearing and the edge fades all live in globals.css (.rr-pins*).
// Hidden layouts use display:none, so their lazy images never load.

type Shape = "short" | "std" | "tall" | "xtall";

type PinSpec = {
  id: string;
  shape: Shape;
  tilt: number;
  saved?: "bottom" | "top";
  slot?: "head" | "foot";
  // Mobile strips only: staggered edge facing the text.
  marginTop?: number;
  marginBottom?: number;
};

const WALL: { cls: string; pins: PinSpec[] }[] = [
  {
    cls: "rr-pins-col rr-pins-col--1",
    pins: [
      { id: "tropical_resort", shape: "tall", tilt: -2.5 },
      { id: "soft_parisian", shape: "std", tilt: 3, saved: "bottom" },
      { id: "industrial", shape: "xtall", tilt: -2 },
    ],
  },
  {
    cls: "rr-pins-col rr-pins-col--2",
    pins: [
      { id: "scandinavian", shape: "std", tilt: 2 },
      { id: "seventies_retro", shape: "xtall", tilt: -3 },
      { id: "library_nook", shape: "tall", tilt: 2.5 },
    ],
  },
  {
    cls: "rr-pins-col rr-pins-col--3 rr-pins-col--split",
    pins: [
      { id: "coastal", shape: "std", tilt: -2, slot: "head" },
      { id: "art_deco", shape: "short", tilt: 3, slot: "foot" },
    ],
  },
  {
    cls: "rr-pins-col rr-pins-col--4 rr-pins-col--split rr-pins-col--desk",
    pins: [{ id: "mid_century_modern", shape: "std", tilt: -2.5, slot: "foot" }],
  },
  {
    cls: "rr-pins-col rr-pins-col--5 rr-pins-col--split rr-pins-col--desk",
    pins: [{ id: "blush_jacuzzi_spa", shape: "tall", tilt: 2, slot: "head" }],
  },
  {
    cls: "rr-pins-col rr-pins-col--6",
    pins: [
      { id: "japandi", shape: "short", tilt: -3 },
      { id: "dark_luxury", shape: "xtall", tilt: 2, saved: "bottom" },
      { id: "mediterranean", shape: "tall", tilt: -2.5 },
    ],
  },
  {
    cls: "rr-pins-col rr-pins-col--7",
    pins: [
      { id: "bohemian", shape: "xtall", tilt: 3, saved: "bottom" },
      { id: "urban_jungle_corner", shape: "tall", tilt: -2 },
      { id: "english_country", shape: "xtall", tilt: 2.5 },
    ],
  },
];

const STRIP_TOP: PinSpec[] = [
  { id: "urban_jungle_corner", shape: "std", tilt: -2, marginBottom: 0 },
  { id: "soft_parisian", shape: "tall", tilt: 3, marginBottom: 18, saved: "bottom" },
  { id: "dark_luxury", shape: "xtall", tilt: -2.5, marginBottom: 6 },
  { id: "coastal", shape: "std", tilt: 2, marginBottom: 24 },
];

const STRIP_BOTTOM: PinSpec[] = [
  { id: "seventies_retro", shape: "tall", tilt: 2.5, marginTop: 14 },
  { id: "mediterranean", shape: "std", tilt: -2, marginTop: 0, saved: "top" },
  { id: "art_deco", shape: "xtall", tilt: 2, marginTop: 22 },
  { id: "japandi", shape: "std", tilt: -3, marginTop: 8 },
];

const WALL_SIZES = "(min-width: 1100px) 190px, 22vw";
const STRIP_SIZES = "116px";

function lookup(id: string): Style {
  const style = styles.find((s) => s.id === id);
  if (!style) throw new Error(`PinMosaic references missing style ${id}`);
  return style;
}

function Pin({ pin, sizes }: { pin: PinSpec; sizes: string }) {
  const style = lookup(pin.id);
  const css: CSSProperties = { transform: `rotate(${pin.tilt}deg)` };
  if (pin.marginTop !== undefined) css.marginTop = pin.marginTop;
  if (pin.marginBottom !== undefined) css.marginBottom = pin.marginBottom;

  return (
    <div
      className={`rr-pin rr-pin--${pin.shape}${pin.slot ? ` rr-pin--${pin.slot}` : ""}`}
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
