import fs from "node:fs";
import path from "node:path";

// The traced "Nola" + "HOME" wordmark (public/images/brand-wordmark.svg, built by
// scripts/trace-wordmark.mjs). Read at build/render time on the server only.
const svg = fs.readFileSync(path.join(process.cwd(), "public/images/brand-wordmark.svg"), "utf8");

const viewBox = svg.match(/viewBox="([^"]+)"/)![1];
const [, , w, h] = viewBox.split(" ").map(Number);

export const WORDMARK = {
  viewBox,
  path: svg.match(/\sd="([^"]+)"/)![1],
  /** width / height */
  ratio: w / h,
};

/** The wordmark as a standalone SVG data URI in one colour (for satori <img>). */
export function wordmarkDataUri(color: string): string {
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${WORDMARK.viewBox}"><path fill="${color}" d="${WORDMARK.path}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(out).toString("base64")}`;
}
