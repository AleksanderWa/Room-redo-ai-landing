// Builds portrait hero crops (BEFORE / AFTER pair) from a real photo and the
// AI result generated from it, aligned so the slider doesn't "jump" between
// the two. The generated image covers the same room and framing but at a
// slightly different aspect (e.g. 1184x864 vs 2048x1536), so it may be
// scaled or offset relative to the photo; this script estimates that and
// applies one crop box identically to both.
//
//   node scripts/make-hero-crops.mjs [--before=PATH] [--after=PATH]
//        [--out=DIR] [--center-x=0..1]
//
// Same options via env: BEFORE, AFTER, OUT_DIR, CENTER_X. Defaults are the
// sibling repos' cluttered-bedroom / japandi pair, and $TMPDIR/hero-crops.
// --center-x is the crop centre as a fraction of BEFORE's width (default:
// the bed in the default pair).
//
// Writes, per variant (9x16 at 1080x1920, 3x4 at 900x1200):
//   hero-<v>-before.jpg, hero-<v>-after.jpg   q82 progressive JPEGs
//   proof-<v>-side-by-side.jpg                 the pair next to each other
//   proof-<v>-split.jpg                        left half BEFORE, right half AFTER
//   proof-<v>-blend.jpg                        50% opacity overlay of the two
// Outputs are previews; copying them into public/images/ is a separate step.

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name, envName, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return process.env[envName] || fallback;
}

const BEFORE = arg(
  "before",
  "BEFORE",
  resolve(repoRoot, "../room-redo-backend/fixtures/qa-photos/cluttered-bedroom.jpg")
);
const AFTER = arg(
  "after",
  "AFTER",
  resolve(repoRoot, "../Room-redo-app/assets/images/styles/japandi.jpg")
);
const OUT = arg("out", "OUT_DIR", join(tmpdir(), "hero-crops"));
const CENTER_X = Number(arg("center-x", "CENTER_X", "0.64"));

const VARIANTS = [
  { name: "9x16", aspect: 9 / 16, width: 1080, height: 1920 },
  { name: "3x4", aspect: 3 / 4, width: 900, height: 1200 },
];

const JPEG = { quality: 82, progressive: true };

// ---------------------------------------------------------------------------
// Alignment
//
// Model: AFTER is first resized to BEFORE's height, then scaled by `s` and
// placed with its top-left at (dx, dy) in BEFORE's pixel space. Searched by
// minimising the mean absolute difference between blurred Sobel edge maps
// of the two (grayscale, downscaled): edges capture the room's structure
// (wall corners, ceiling slope, window) and ignore the restyle's colours.
// Coarse grid at a small working size, then a finer pass around the best.
// ---------------------------------------------------------------------------

async function grayRaw(input, width, height) {
  const { data, info } = await sharp(input)
    .resize(width, height, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function edgeMap({ data, width, height }) {
  const mag = new Float32Array(width * height);
  const at = (x, y) =>
    data[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx =
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) -
        at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const gy =
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) -
        at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      mag[y * width + x] = Math.hypot(gx, gy);
    }
  }
  // 3x3 box blur so near-misses still score, then normalise to 0..1.
  const out = new Float32Array(width * height);
  let max = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const xx = x + i;
          const yy = y + j;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
          sum += mag[yy * width + xx];
          n++;
        }
      }
      out[y * width + x] = sum / n;
      if (out[y * width + x] > max) max = out[y * width + x];
    }
  }
  for (let k = 0; k < out.length; k++) out[k] /= max || 1;
  return { data: out, width, height };
}

// Mean abs diff over the overlap; rejects placements covering < 85% of
// BEFORE so the search can't "win" by sliding AFTER mostly off-frame.
function cost(before, after, s, dx, dy) {
  const { width: w, height: h } = before;
  let sum = 0;
  let n = 0;
  for (let y = 0; y < h; y += 1) {
    const ay = (y - dy) / s;
    if (ay < 0 || ay > after.height - 1) continue;
    const y0 = Math.floor(ay);
    const fy = ay - y0;
    const y1 = Math.min(y0 + 1, after.height - 1);
    for (let x = 0; x < w; x += 1) {
      const ax = (x - dx) / s;
      if (ax < 0 || ax > after.width - 1) continue;
      const x0 = Math.floor(ax);
      const fx = ax - x0;
      const x1 = Math.min(x0 + 1, after.width - 1);
      const a = after.data;
      const v =
        a[y0 * after.width + x0] * (1 - fx) * (1 - fy) +
        a[y0 * after.width + x1] * fx * (1 - fy) +
        a[y1 * after.width + x0] * (1 - fx) * fy +
        a[y1 * after.width + x1] * fx * fy;
      sum += Math.abs(v - before.data[y * w + x]);
      n++;
    }
  }
  if (n < 0.85 * w * h) return Infinity;
  return sum / n;
}

function search(before, after, scales, dxs, dys) {
  let best = { c: Infinity };
  for (const s of scales) {
    for (const dx of dxs) {
      for (const dy of dys) {
        const c = cost(before, after, s, dx, dy);
        if (c < best.c) best = { c, s, dx, dy };
      }
    }
  }
  return best;
}

const range = (from, to, step) => {
  const out = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
};

async function align(beforeMeta, afterMeta) {
  // AFTER at BEFORE's height (full-res units).
  const afterW = Math.round((afterMeta.width * beforeMeta.height) / afterMeta.height);
  const H = beforeMeta.height;
  const W = beforeMeta.width;

  // Pass 1: working height 120.
  const k1 = 120 / H;
  const b1 = edgeMap(await grayRaw(BEFORE, Math.round(W * k1), 120));
  const a1 = edgeMap(await grayRaw(AFTER, Math.round(afterW * k1), 120));
  const p1 = search(
    b1,
    a1,
    range(0.9, 1.15, 0.01),
    range(-0.15 * b1.width, 0.15 * b1.width, 1),
    range(-0.1 * b1.height, 0.1 * b1.height, 1)
  );

  // Pass 2: working height 300, around pass 1.
  const k2 = 300 / H;
  const b2 = edgeMap(await grayRaw(BEFORE, Math.round(W * k2), 300));
  const a2 = edgeMap(await grayRaw(AFTER, Math.round(afterW * k2), 300));
  const f = 300 / 120;
  const p2 = search(
    b2,
    a2,
    range(p1.s - 0.012, p1.s + 0.012, 0.003),
    range(p1.dx * f - 3, p1.dx * f + 3, 0.5),
    range(p1.dy * f - 3, p1.dy * f + 3, 0.5)
  );

  // Identity placement (AFTER at BEFORE height, left-aligned, centred) for
  // comparison in the printout.
  const identity = cost(b2, a2, 1, ((W - afterW) / 2) * k2, 0);

  return {
    afterW,
    s: p2.s,
    dx: p2.dx / k2,
    dy: p2.dy / k2,
    cost: p2.c,
    identityCost: identity,
  };
}

// ---------------------------------------------------------------------------
// Crops
// ---------------------------------------------------------------------------

async function main() {
  mkdirSync(OUT, { recursive: true });
  const beforeMeta = await sharp(BEFORE).metadata();
  const afterMeta = await sharp(AFTER).metadata();
  const W = beforeMeta.width;
  const H = beforeMeta.height;
  console.log(`before: ${BEFORE} (${W}x${H})`);
  console.log(`after:  ${AFTER} (${afterMeta.width}x${afterMeta.height})`);

  const a = await align(beforeMeta, afterMeta);
  const placedW = a.afterW * a.s;
  const placedH = H * a.s;
  console.log(
    `alignment: AFTER resized to ${a.afterW}x${H}, then scale=${a.s.toFixed(3)}, ` +
      `dx=${a.dx.toFixed(1)}px, dy=${a.dy.toFixed(1)}px (BEFORE pixels); ` +
      `edge MAD ${a.cost.toFixed(4)} vs ${a.identityCost.toFixed(4)} unaligned`
  );

  // AFTER warped into BEFORE's frame. Areas it doesn't cover stay black, but
  // the crop box below is kept inside the covered region.
  const afterPlaced = await sharp(AFTER)
    .resize(Math.round(placedW), Math.round(placedH), { fit: "fill" })
    .toBuffer();
  const left = Math.round(a.dx);
  const top = Math.round(a.dy);
  const afterAligned = await sharp({
    create: { width: W, height: H, channels: 3, background: "#000" },
  })
    .composite([{ input: afterPlaced, left, top }])
    .png()
    .toBuffer()
    .catch(async () => {
      // composite() rejects overlays extending past the canvas; extract the
      // visible part first.
      const ex = {
        left: Math.max(0, -left),
        top: Math.max(0, -top),
      };
      ex.width = Math.min(Math.round(placedW) - ex.left, W - Math.max(0, left));
      ex.height = Math.min(Math.round(placedH) - ex.top, H - Math.max(0, top));
      const part = await sharp(afterPlaced).extract(ex).toBuffer();
      return sharp({ create: { width: W, height: H, channels: 3, background: "#000" } })
        .composite([{ input: part, left: Math.max(0, left), top: Math.max(0, top) }])
        .png()
        .toBuffer();
    });

  // Region covered by both images.
  const cover = {
    x0: Math.max(0, Math.ceil(a.dx)),
    y0: Math.max(0, Math.ceil(a.dy)),
    x1: Math.min(W, Math.floor(a.dx + placedW)),
    y1: Math.min(H, Math.floor(a.dy + placedH)),
  };
  console.log(`overlap: x ${cover.x0}..${cover.x1}, y ${cover.y0}..${cover.y1}`);

  for (const v of VARIANTS) {
    const ch = cover.y1 - cover.y0;
    const cw = Math.round(ch * v.aspect);
    const cx = CENTER_X * W;
    const x = Math.round(
      Math.min(cover.x1 - cw, Math.max(cover.x0, cx - cw / 2))
    );
    const box = { left: x, top: cover.y0, width: cw, height: ch };
    console.log(
      `${v.name}: crop ${cw}x${ch} at (${box.left},${box.top}) in BEFORE pixels ` +
        `-> ${v.width}x${v.height} (upscale x${(v.height / ch).toFixed(2)} from BEFORE, ` +
        `x${((v.height / ch) * (placedH / afterMeta.height)).toFixed(2)} from AFTER's native pixels)`
    );

    const beforeCrop = await sharp(BEFORE)
      .extract(box)
      .resize(v.width, v.height, { fit: "fill", kernel: "lanczos3" })
      .jpeg(JPEG)
      .toBuffer();
    const afterCrop = await sharp(afterAligned)
      .extract(box)
      .resize(v.width, v.height, { fit: "fill", kernel: "lanczos3" })
      .jpeg(JPEG)
      .toBuffer();
    await sharp(beforeCrop).toFile(join(OUT, `hero-${v.name}-before.jpg`));
    await sharp(afterCrop).toFile(join(OUT, `hero-${v.name}-after.jpg`));

    // Proofs.
    const gap = 16;
    await sharp({
      create: { width: v.width * 2 + gap, height: v.height, channels: 3, background: "#fff" },
    })
      .composite([
        { input: beforeCrop, left: 0, top: 0 },
        { input: afterCrop, left: v.width + gap, top: 0 },
      ])
      .jpeg(JPEG)
      .toFile(join(OUT, `proof-${v.name}-side-by-side.jpg`));

    const half = Math.round(v.width / 2);
    const rightHalf = await sharp(afterCrop)
      .extract({ left: half, top: 0, width: v.width - half, height: v.height })
      .toBuffer();
    const line = await sharp({
      create: { width: 2, height: v.height, channels: 3, background: "#ff3b30" },
    })
      .png()
      .toBuffer();
    await sharp(beforeCrop)
      .composite([
        { input: rightHalf, left: half, top: 0 },
        { input: line, left: half - 1, top: 0 },
      ])
      .jpeg(JPEG)
      .toFile(join(OUT, `proof-${v.name}-split.jpg`));

    const translucent = await sharp(afterCrop)
      .ensureAlpha(0.5)
      .png()
      .toBuffer();
    await sharp(beforeCrop)
      .composite([{ input: translucent, left: 0, top: 0 }])
      .jpeg(JPEG)
      .toFile(join(OUT, `proof-${v.name}-blend.jpg`));
  }

  console.log(`wrote outputs to ${OUT}`);
}

await main();
