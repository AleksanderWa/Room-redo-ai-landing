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
import { boxInAfter, estimateAlignment, placedRect } from "./lib/align.mjs";

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
const ALIGN = { scales: [0.6, 1.2], shiftX: 0.25, shiftY: 0.25, minOverlap: 0.4 };

if (!RESULTS_DIR) {
  console.error("error: set CORNER_RESULTS_DIR (or --results=DIR) to the folder with the result images.");
  process.exit(1);
}

const results = JSON.parse(readFileSync(join(here, "corner-results.json"), "utf8")).filter(
  (r) => r.file
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
    r.a = await estimateAlignment(BEFORE, r.path, ALIGN);
    const p = placedRect(r.a, bm.height);
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

  // Largest 3:4 box inside the intersection, centred in it. Inset 1px so
  // rounding never samples outside a result.
  const iw = Math.floor(inter.x1 - inter.x0) - 2;
  const ih = Math.floor(inter.y1 - inter.y0) - 2;
  const height = Math.min(ih, Math.floor((iw * 4) / 3));
  const width = Math.floor((height * 3) / 4);
  const box = {
    left: Math.round((inter.x0 + inter.x1 - width) / 2),
    top: Math.round((inter.y0 + inter.y1 - height) / 2),
    width,
    height,
  };
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

  const before = await resize(BEFORE, box);
  await sharp(before).jpeg(JPEG).toFile(join(OUT, "understairs-before.jpg"));

  for (const r of results) {
    const ex = boxInAfter(box, r.a, bm.height, r.meta.height);
    ex.left = Math.max(0, ex.left);
    ex.top = Math.max(0, ex.top);
    ex.width = Math.min(ex.width, r.meta.width - ex.left);
    ex.height = Math.min(ex.height, r.meta.height - ex.top);
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
