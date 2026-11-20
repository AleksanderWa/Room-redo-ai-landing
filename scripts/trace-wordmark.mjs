// Traces the "Nola" + "HOME" masthead of the real app icon into a transparent,
// single-colour SVG wordmark (public/images/brand-wordmark.svg). Never retype
// or redraw it: the lettering is the brand mark, so this follows the icon.
//
// Needs the `potrace` CLI (brew install potrace) and svgo (npx).
//
//   node scripts/trace-wordmark.mjs
//
// Steps: crop the masthead, upscale 3x (lanczos3), light blur, threshold so
// the sunlight streaks drop out, potrace, then svgo + fill="currentColor".

import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SRC = "assets/brand/icon-source-1254.png";
const DEST = "public/images/brand-wordmark.svg";
const CROP = { left: 80, top: 90, width: 1120, height: 560 };
const SCALE = 3;
const THRESHOLD = 120; // ink is ~40, cream/shadow streaks are >180
const BLUR = 1.2;

const dir = mkdtempSync(path.join(tmpdir(), "wordmark-"));
const pbm = path.join(dir, "mark.pgm");
const raw = path.join(dir, "mark.svg");

const { data, info } = await sharp(SRC)
  .extract(CROP)
  .resize(CROP.width * SCALE, CROP.height * SCALE, { kernel: "lanczos3" })
  .greyscale()
  .blur(BLUR)
  .threshold(THRESHOLD)
  .raw()
  .toBuffer({ resolveWithObject: true });
// 8-bit PGM that potrace reads directly.
writeFileSync(pbm, Buffer.concat([Buffer.from(`P5\n${info.width} ${info.height}\n255\n`), data]));

// -t 40 drops specks, -a 1.1 keeps corners (serifs) sharp, -O 0.4 simplifies curves.
execFileSync("potrace", [pbm, "-s", "-o", raw, "-t", "40", "-a", "1.1", "-O", "0.4", "--flat", "-u", "10"]);

let svg = readFileSync(raw, "utf8");
writeFileSync(raw, svg);
execFileSync("npx", ["--yes", "svgo", raw, "-o", raw, "--multipass", "--precision=1"], { stdio: "inherit" });
svg = readFileSync(raw, "utf8");

// Tight viewBox from the ink pixels (potrace coordinates are pixels of the
// upscaled crop), no width/height so CSS sizes it, colour from CSS.
let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[y * info.width + x] === 0) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
}
const d = svg.match(/<path[^>]*\sd="([^"]+)"/)[1];
const out =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0 + 1} ${y1 - y0 + 1}">` +
  `<path fill="currentColor" d="${d}"/></svg>\n`;
writeFileSync(DEST, out);
console.log(`wrote ${DEST} (${out.length} bytes, viewBox ${x0} ${y0} ${x1 - x0 + 1} ${y1 - y0 + 1})`);
