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

/**
 * Coarse-to-fine search over working heights 60 -> 120 -> 300 px.
 * Options: scales [lo, hi] for the coarse pass, shiftX / shiftY as fractions
 * of BEFORE's width / height, minOverlap (fraction of BEFORE covered).
 * Returns { afterW, s, dx, dy, cost } in full-res BEFORE pixels.
 */
export async function estimateAlignment(beforePath, afterPath, opts = {}) {
  const { scales = [0.9, 1.15], shiftX = 0.15, shiftY = 0.1, minOverlap = 0.85 } = opts;
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

  // Pass 0: whole range, coarse.
  let m = await maps(60);
  let best = search(
    m.b, m.a,
    range(scales[0], scales[1], 0.02),
    range(-shiftX * m.b.width, shiftX * m.b.width, 1),
    range(-shiftY * m.b.height, shiftY * m.b.height, 1),
    minOverlap
  );
  // Refinement passes around the previous best.
  for (const [h, ds, dp, sp] of [[120, 0.03, 3, 0.5], [300, 0.012, 3, 0.5]]) {
    const prevK = m.k;
    m = await maps(h);
    const f = m.k / prevK;
    best = search(
      m.b, m.a,
      range(best.s - ds, best.s + ds, ds / 6),
      range(best.dx * f - dp, best.dx * f + dp, sp),
      range(best.dy * f - dp, best.dy * f + dp, sp),
      minOverlap
    );
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
