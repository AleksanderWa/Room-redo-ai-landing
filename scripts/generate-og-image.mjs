// Generates the static 1200x630 Open Graph image from storage-after.jpg.
// Run once after `bash scripts/copy-assets.sh` and `node scripts/make-brand-assets.mjs`
// (it composites public/images/brand-wordmark.svg, see scripts/trace-wordmark.mjs), and commit the result —
// this is deliberately a static, committed file rather than a dynamic
// next/og route: the image never changes per-request, so a dynamic route
// would only add a cold-start on the social-crawler fetch path for no
// benefit.
//
//   node scripts/generate-og-image.mjs

import sharp from "sharp";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const SRC = "public/images/storage-after.jpg";
const DEST = "public/og.jpg";

if (!existsSync(SRC)) {
  console.error(
    `error: ${SRC} not found — run 'bash scripts/copy-assets.sh' first.`
  );
  process.exit(1);
}

const WORDMARK = "public/images/brand-wordmark.svg";
const FONT = "assets/fonts/dm-sans-latin-600-normal.woff";
for (const f of [WORDMARK, FONT]) {
  if (!existsSync(f)) {
    console.error(`error: ${f} not found.`);
    process.exit(1);
  }
}

// Same left-to-right scrim as ogCard() in lib/content/og.tsx.
const scrim = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="rgb(20,16,12)" stop-opacity="0.78"/>
      <stop offset="0.5" stop-color="rgb(20,16,12)" stop-opacity="0.6"/>
      <stop offset="1" stop-color="rgb(20,16,12)" stop-opacity="0"/>
    </linearGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>
  </svg>`,
);

// The tagline is DM Sans 600, the font ogCard() uses. Rendered with the same
// next/og (satori) engine as the article cards, because librsvg cannot load a
// woff. Transparent background, composited onto the photo.
const { ImageResponse } = await import("next/og.js");
const tagline = Buffer.from(
  await new ImageResponse(
    {
      type: "div",
      props: {
        style: { display: "flex", fontFamily: "DM Sans", fontSize: 24, color: "#f7f2ea" },
        children: "First redesign free · iPhone",
      },
    },
    {
      width: 400,
      height: 40,
      fonts: [{ name: "DM Sans", data: await readFile(FONT), style: "normal", weight: 600 }],
    },
  ).arrayBuffer(),
);

// Cream wordmark, same 76px height as ogCard(). Rasterised from the SVG at about
// 4x the target height and downscaled, so the edges stay crisp.
const markSvg = (await readFile(WORDMARK, "utf8")).replace("currentColor", "#f7f2ea");
const markVb = markSvg.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/);
const MARK_H = 76;
const MARK_W = Math.round((MARK_H * markVb[1]) / markVb[2]);
// sharp's density is dpi; SVG user units map to px at density / 72.
const density = (72 * (MARK_H * 4)) / markVb[2];
const mark = await sharp(Buffer.from(markSvg), { density })
  .resize(MARK_W, MARK_H, { kernel: "lanczos3" })
  .png()
  .toBuffer();

await sharp(SRC)
  .resize(1200, 630, { fit: "cover" })
  .composite([
    { input: scrim, top: 0, left: 0 },
    { input: mark, top: 64, left: 64 },
    { input: tagline, top: 64 + MARK_H + 12, left: 64 },
  ])
  .jpeg({ quality: 88 })
  .toFile(DEST);

console.log(`wrote ${DEST} (1200x630)`);
