"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { STYLE_SECTIONS, styleAlt, styles, type StyleSection } from "@/data/styles";

type Filter = "All" | StyleSection;

const FILTERS: Filter[] = ["All", ...STYLE_SECTIONS];

/** Collapsed "All" view: the first 24 from tablet up, the first 12 on mobile.
 * Everything is still rendered (so all 47 names are in the HTML) and hidden
 * with CSS: display:none keeps the lazy thumbs from loading until expanded. */
const COLLAPSED_WIDE = 24;
const COLLAPSED_NARROW = 12;

// Grid is 3 columns on mobile, 6 on tablet, 8 on desktop.
const THUMB_SIZES = "(min-width: 1100px) 130px, (min-width: 700px) 16vw, 31vw";

function collapsedClass(collapsed: boolean, i: number): string | undefined {
  if (!collapsed) return undefined;
  if (i >= COLLAPSED_WIDE) return "rr-style-item--beyond-lg";
  if (i >= COLLAPSED_NARROW) return "rr-style-item--beyond-sm";
  return undefined;
}

export default function StyleWall() {
  const [filter, setFilter] = useState<Filter>("All");
  const [expanded, setExpanded] = useState(false);
  const gridRef = useRef<HTMLUListElement>(null);

  const collapsed = filter === "All" && !expanded;
  const filtered = filter === "All" ? styles : styles.filter((s) => s.section === filter);

  function expand() {
    setExpanded(true);
    // The button unmounts once everything is showing; hand focus to the grid
    // so keyboard users aren't dropped back at the top of the page.
    requestAnimationFrame(() => gridRef.current?.focus());
  }

  return (
    <>
      <div role="group" aria-label="Filter styles" className="rr-chips">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className="rr-chip"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <ul ref={gridRef} tabIndex={-1} aria-label="Styles" className="rr-style-grid">
        {filtered.map((style, i) => (
          <li key={style.id} className={collapsedClass(collapsed, i)}>
            <figure className="rr-style-fig">
              <div className="rr-style-thumb">
                <Image
                  src={style.thumb}
                  alt={styleAlt(style)}
                  fill
                  sizes={THUMB_SIZES}
                  style={{ objectFit: "cover" }}
                />
              </div>
              <figcaption className="rr-style-caption">{style.name}</figcaption>
            </figure>
          </li>
        ))}
      </ul>

      {collapsed && (
        <div className="rr-more">
          <button type="button" className="rr-more-button" onClick={expand}>
            See all {styles.length} styles →
          </button>
        </div>
      )}
    </>
  );
}
