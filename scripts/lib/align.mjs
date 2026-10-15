// Shared image-alignment helpers for the crop scripts (make-hero-crops.mjs,
// make-corner-crops.mjs). Estimates how an AI result (AFTER) sits inside the
// photo it was generated from (BEFORE): same room and framing, but possibly
// scaled or offset.
//
// Model: AFTER is first resized to BEFORE's height, then scaled by `s` and
// placed with its top-left at (dx, dy) in BEFORE's pixel space. Searched by
// minimising the mean absolute difference between blurred Sobel edge maps
// of the two (grayscale, downscaled): edges capture the room's structure
// (wall corners, ceiling slope, window) and ignore the restyle's colours.

import sharp from "sharp";

export async function grayRaw(input, width, height) {
  const { data, info } = await sharp(input)
    .resize(width, height, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export function edgeMap({ data, width, height }) {
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

// Mean abs diff over the overlap; rejects placements covering less than
// `minOverlap` of BEFORE so the search can't "win" by sliding AFTER mostly
// off-frame.
export function cost(before, after, s, dx, dy, minOverlap = 0.85) {
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
  if (n < minOverlap * w * h) return Infinity;
  return sum / n;
}

export function search(before, after, scales, dxs, dys, minOverlap) {
  let best = { c: Infinity };
  for (const s of scales) {
    for (const dx of dxs) {
      for (const dy of dys) {
        const c = cost(before, after, s, dx, dy, minOverlap);
        if (c < best.c) best = { c, s, dx, dy };
      }
    }
  }
  return best;
}

export const range = (from, to, step) => {
  const out = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
};

// Coarse-to-fine schedule: the first pass covers the whole scale/shift
// range; each later pass refines around the previous best at a larger
// working height. Steps are in working-size pixels.
export const CORNER_PASSES = [
  { height: 60, scaleStep: 0.02, shiftStep: 1 },
  { height: 120, scaleSpan: 0.03, scaleStep: 0.03 / 6, shiftSpan: 3, shiftStep: 0.5 },
  { height: 300, scaleSpan: 0.012, scaleStep: 0.012 / 6, shiftSpan: 3, shiftStep: 0.5 },
];

/**
 * Estimates where AFTER sits in BEFORE.
 * Options: scales [lo, hi] for the first pass (its grid is snapped to
 * multiples of the step, so moving a bound never shifts the grid), shiftX /
 * shiftY as fractions of BEFORE's width / height, minOverlap (fraction of
 * BEFORE the placement must cover), passes (schedule, default
 * CORNER_PASSES), name (used in errors).
 * Returns { afterW, s, dx, dy, cost } in full-res BEFORE pixels; throws if
 * no placement satisfies minOverlap.
 */
export async function estimateAlignment(beforePath, afterPath, opts = {}) {
  const {
    scales = [0.9, 1.15],
    shiftX = 0.15,
    shiftY = 0.1,
    minOverlap = 0.85,
    passes = CORNER_PASSES,
    name = afterPath,
  } = opts;
  const bm = await sharp(beforePath).metadata();
  const am = await sharp(afterPath).metadata();
  const H = bm.height;
  const W = bm.width;
  const afterW = Math.round((am.width * H) / am.height);

  const maps = async (h) => {
    const k = h / H;
    return {
      k,
      b: edgeMap(await grayRaw(beforePath, Math.round(W * k), h)),
      a: edgeMap(await grayRaw(afterPath, Math.round(afterW * k), h)),
    };
  };

  let best = null;
  let m = null;
  let prevH = 0;
  for (const p of passes) {
    m = await maps(p.height);
    if (!best) {
      const lo = +(Math.ceil(scales[0] / p.scaleStep - 1e-9) * p.scaleStep).toFixed(6);
      best = search(
        m.b, m.a,
        range(lo, scales[1], p.scaleStep),
        range(-shiftX * m.b.width, shiftX * m.b.width, p.shiftStep),
        range(-shiftY * m.b.height, shiftY * m.b.height, p.shiftStep),
        minOverlap
      );
    } else {
      const f = p.height / prevH;
      best = search(
        m.b, m.a,
        range(best.s - p.scaleSpan, best.s + p.scaleSpan, p.scaleStep),
        range(best.dx * f - p.shiftSpan, best.dx * f + p.shiftSpan, p.shiftStep),
        range(best.dy * f - p.shiftSpan, best.dy * f + p.shiftSpan, p.shiftStep),
        minOverlap
      );
    }
    if (!Number.isFinite(best.c)) {
      throw new Error(
        `alignment failed for ${name}: no placement covers at least ${Math.round(minOverlap * 100)}% ` +
          `of the before photo (scale ${scales[0]}-${scales[1]}, shift ±${shiftX * 100}% x / ±${shiftY * 100}% y, ` +
          `pass at ${p.height}px). Is it a result for this photo?`
      );
    }
    prevH = p.height;
  }
  return { afterW, s: best.s, dx: best.dx / m.k, dy: best.dy / m.k, cost: best.c };
}

/** AFTER's placed rectangle in BEFORE pixels. */
export function placedRect(a, beforeH) {
  return { x0: a.dx, y0: a.dy, x1: a.dx + a.afterW * a.s, y1: a.dy + beforeH * a.s };
}

/** Maps a box in BEFORE pixels into AFTER's native pixels. */
export function boxInAfter(box, a, beforeH, afterH) {
  const k = afterH / (beforeH * a.s);
  return {
    left: Math.round((box.left - a.dx) * k),
    top: Math.round((box.top - a.dy) * k),
    width: Math.round(box.width * k),
    height: Math.round(box.height * k),
  };
}
