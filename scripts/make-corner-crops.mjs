// Builds the corners section's before + results: the app's corner-flow
// results for the under-stairs photo, aligned to that photo and cut with ONE
// shared 3:4 crop box, so switching results in the slider never shifts the
// room.
//
//   CORNER_RESULTS_DIR=/path/to/results node scripts/make-corner-crops.mjs
//        [--before=PATH] [--out=DIR] [--proofs=DIR | --no-proofs]
//
// Results are listed in scripts/corner-results.json ({ id, file, label,
// group, caption, alt }); entries with "file": null are skipped (and not
// shown on the page). Each result is aligned to BEFORE with the edge-map
// search in scripts/lib/align.mjs; the crop box is the largest 3:4 box
// inside the intersection of BEFORE and every placed result.
//
// Writes 900x1200 q82 progressive JPEGs, each encoded once:
//   <out>/understairs-before.jpg, <out>/understairs-<id>.jpg
//   <proofs>/proof-<id>-split.jpg   left half BEFORE, right half result
// Defaults: --before is the app repo's assets/e2e/corner-understairs.jpg,
// --out is public/images/corner, proofs go to $TMPDIR/corner-crops.

import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { estimateAlignment, placedRect } from "./lib/align.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function arg(name, envName, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return (envName && process.env[envName]) || fallback;
}

const RESULTS_DIR = arg("results", "CORNER_RESULTS_DIR", null);
const BEFORE = arg(
  "before",
  "BEFORE",
  resolve(repoRoot, "../Room-redo-app/assets/e2e/corner-understairs.jpg")
);
const OUT = arg("out", "OUT_DIR", resolve(repoRoot, "public/images/corner"));
const PROOFS = process.argv.includes("--no-proofs")
  ? null
  : arg("proofs", "PROOFS_DIR", join(tmpdir(), "corner-crops"));

const SIZE = { width: 900, height: 1200 };
const JPEG = { quality: 82, progressive: true };
// Results are framed tighter than the photo (observed scale 0.83-0.93), so
// the range starts well below that; minOverlap 0.4 lets a result that
// covers ~0.75^2 of the photo still qualify.
const ALIGN = { scales: [0.75, 1.2], shiftX: 0.25, shiftY: 0.25, minOverlap: 0.4 };
// The shared crop must keep at least this share of the before photo.
const MIN_SHARED_AREA = 0.5;

if (!RESULTS_DIR) {
  console.error("error: set CORNER_RESULTS_DIR (or --results=DIR) to the folder with the result images.");
  process.exit(1);
}

// "Has a result" rule; keep in sync with data/corners.ts (same expression).
const hasResult = (r) => typeof r.file === "string" && r.file.trim() !== "";
const results = JSON.parse(readFileSync(join(here, "corner-results.json"), "utf8")).filter(
  hasResult
);

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (PROOFS) mkdirSync(PROOFS, { recursive: true });

  const bm = await sharp(BEFORE).metadata();
  console.log(`before: ${BEFORE} (${bm.width}x${bm.height})`);

  // Align every result; intersect their placed rects with BEFORE's frame.
  let inter = { x0: 0, y0: 0, x1: bm.width, y1: bm.height };
  for (const r of results) {
    r.path = join(RESULTS_DIR, r.file);
    r.meta = await sharp(r.path).metadata();
    r.a = await estimateAlignment(BEFORE, r.path, { ...ALIGN, name: `${r.id} (${r.file})` });
    const p = placedRect(r.a, bm.height);
    // Share of the before photo this result covers, to name the worst one.
    r.coverage =
      (Math.max(0, Math.min(bm.width, p.x1) - Math.max(0, p.x0)) *
        Math.max(0, Math.min(bm.height, p.y1) - Math.max(0, p.y0))) /
      (bm.width * bm.height);
    inter = {
      x0: Math.max(inter.x0, p.x0),
      y0: Math.max(inter.y0, p.y0),
      x1: Math.min(inter.x1, p.x1),
      y1: Math.min(inter.y1, p.y1),
    };
    console.log(
      `${r.id} (${r.file}, ${r.meta.width}x${r.meta.height}): scale=${r.a.s.toFixed(3)} ` +
        `(of BEFORE height), dx=${r.a.dx.toFixed(1)}, dy=${r.a.dy.toFixed(1)} BEFORE px, ` +
        `edge MAD ${r.a.cost.toFixed(4)}`
    );
  }

  const interArea =
    Math.max(0, inter.x1 - inter.x0) * Math.max(0, inter.y1 - inter.y0);
  if (interArea < MIN_SHARED_AREA * bm.width * bm.height) {
    const worst = results.reduce((w, r) => (r.coverage < w.coverage ? r : w));
    throw new Error(
      `shared crop too small: the area every result covers is ${Math.round(
        (100 * interArea) / (bm.width * bm.height)
      )}% of the before photo (need ${MIN_SHARED_AREA * 100}%). ` +
        `Worst-aligned: ${worst.id} (${worst.file}), covering ${Math.round(100 * worst.coverage)}% ` +
        `(edge MAD ${worst.a.cost.toFixed(4)}).`
    );
  }

  // A box in a result's native pixels for `box` (BEFORE pixels), exactly
  // 3:4 (width a multiple of 3), centred on the same point; null if it
  // doesn't fit inside the result.
  function resultBox(r, box) {
    const k = r.meta.height / (bm.height * r.a.s);
    const width = 3 * Math.round((box.width * k) / 3);
    const height = (width / 3) * 4;
    const left = Math.round((box.left + box.width / 2 - r.a.dx) * k - width / 2);
    const top = Math.round((box.top + box.height / 2 - r.a.dy) * k - height / 2);
    const fits =
      left >= 0 && top >= 0 && left + width <= r.meta.width && top + height <= r.meta.height;
    return fits ? { left, top, width, height } : null;
  }

  // Largest exactly-3:4 box inside the intersection, centred in it, then
  // shrunk (never clamped per result) until it fits inside every result, so
  // the before and all results show the same region and nothing stretches.
  const iw = Math.floor(inter.x1 - inter.x0) - 2;
  const ih = Math.floor(inter.y1 - inter.y0) - 2;
  let n = Math.floor(Math.min(ih / 4, iw / 3));
  let box;
  for (; n > 0; n--) {
    const width = 3 * n;
    const height = 4 * n;
    box = {
      left: Math.round((inter.x0 + inter.x1 - width) / 2),
      top: Math.round((inter.y0 + inter.y1 - height) / 2),
      width,
      height,
    };
    if (results.every((r) => (r.ex = resultBox(r, box)))) break;
  }
  if (n === 0) throw new Error("no 3:4 box fits inside every result");
  const { width, height } = box;
  console.log(
    `shared crop: ${width}x${height} at (${box.left},${box.top}) in BEFORE px ` +
      `(BEFORE scaled x${(SIZE.height / height).toFixed(2)} to ${SIZE.width}x${SIZE.height})`
  );

  // Lossless until the single JPEG encode per file.
  const resize = (img, ex) =>
    sharp(img)
      .extract(ex)
      .resize(SIZE.width, SIZE.height, { fit: "fill", kernel: "lanczos3" })
      .png()
      .toBuffer();

  const assert34 = (b, what) => {
    if (b.width * 4 !== b.height * 3) throw new Error(`${what} crop ${b.width}x${b.height} is not 3:4`);
  };
  assert34(box, "before");
  const before = await resize(BEFORE, box);
  await sharp(before).jpeg(JPEG).toFile(join(OUT, "understairs-before.jpg"));

  for (const r of results) {
    const ex = r.ex;
    assert34(ex, r.id);
    const after = await resize(r.path, ex);
    await sharp(after).jpeg(JPEG).toFile(join(OUT, `understairs-${r.id}.jpg`));
    console.log(`  ${r.id}: result crop ${ex.width}x${ex.height} at (${ex.left},${ex.top}) native px`);

    if (PROOFS) {
      const half = SIZE.width / 2;
      const right = await sharp(after)
        .extract({ left: half, top: 0, width: SIZE.width - half, height: SIZE.height })
        .toBuffer();
      const line = await sharp({
        create: { width: 2, height: SIZE.height, channels: 3, background: "#ff3b30" },
      })
        .png()
        .toBuffer();
      await sharp(before)
        .composite([
          { input: right, left: half, top: 0 },
          { input: line, left: half - 1, top: 0 },
        ])
        .jpeg(JPEG)
        .toFile(join(PROOFS, `proof-${r.id}-split.jpg`));
    }
  }
  console.log(`wrote ${OUT}${PROOFS ? ` (proofs in ${PROOFS})` : ""}`);
}

await main();
