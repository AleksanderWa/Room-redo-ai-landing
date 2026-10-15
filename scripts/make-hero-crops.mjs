// Builds portrait hero crops (BEFORE / AFTER pair) from a real photo and the
// AI result generated from it, aligned so the slider doesn't "jump" between
// the two. The generated image covers the same room and framing but at a
// slightly different aspect (e.g. 1184x864 vs 2048x1536), so it may be
// scaled or offset relative to the photo; this script estimates that and
// applies one crop box identically to both.
//
//   node scripts/make-hero-crops.mjs [--before=PATH] [--after=PATH]
//        [--out=DIR] [--center-x=0..1] [--variants=9x16,3x4] [--no-proofs]
//
// Same options via env: BEFORE, AFTER, OUT_DIR, CENTER_X, VARIANTS,
// NO_PROOFS=1. Defaults are the sibling repos' cluttered-bedroom / japandi
// pair, $TMPDIR/hero-crops, both variants, proofs on. --center-x is the crop
// centre as a fraction of BEFORE's width (default: the bed in the default
// pair).
//
// Writes, per selected variant (9x16 at 720x1280, 3x4 at 900x1200):
//   hero-<v>-before.jpg, hero-<v>-after.jpg   q82 progressive JPEGs
//   proof-<v>-side-by-side.jpg                 the pair next to each other
//   proof-<v>-split.jpg                        left half BEFORE, right half AFTER
//   proof-<v>-blend.jpg                        50% opacity overlay of the two
// and always:
//   step-reveal.jpg   384x512 "How it works" step 3: left half BEFORE, right
//                     half AFTER, thin cream divider (from the 3:4 box)
// 720x1280 because the generated AFTER is only 864px tall: the hero phone
// shows it at ~385 CSS px wide, so 720w covers ~1.9x DPR without inventing
// pixels the source doesn't have (1080x1920 was a 2.2x upscale).
// scripts/copy-assets.sh runs this with --variants=9x16 --no-proofs and copies
// the 9x16 pair and step-reveal.jpg into public/images/.

import sharp from "sharp";
import { cost, edgeMap, grayRaw, range, search } from "./lib/align.mjs";
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

const ALL_VARIANTS = [
  { name: "9x16", aspect: 9 / 16, width: 720, height: 1280 },
  { name: "3x4", aspect: 3 / 4, width: 900, height: 1200 },
];
const wanted = arg("variants", "VARIANTS", "9x16,3x4").split(",");
const VARIANTS = ALL_VARIANTS.filter((v) => wanted.includes(v.name));
if (VARIANTS.length === 0) {
  console.error(`error: --variants must list some of ${ALL_VARIANTS.map((v) => v.name).join(",")}`);
  process.exit(1);
}
const PROOFS = !process.argv.includes("--no-proofs") && process.env.NO_PROOFS !== "1";

const STEP_REVEAL = { width: 384, height: 512 };
const CREAM = "#f7f2ea"; // --rr-cream

const JPEG = { quality: 82, progressive: true };

// ---------------------------------------------------------------------------
// Alignment
//
// Model and edge-map helpers: scripts/lib/align.mjs. The hero pair differs
// only slightly, so this uses a narrow two-pass search (0.9-1.15 scale)
// rather than the library's wider estimateAlignment().
// ---------------------------------------------------------------------------

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

  function boxFor(aspect) {
    const ch = cover.y1 - cover.y0;
    const cw = Math.round(ch * aspect);
    const cx = CENTER_X * W;
    const x = Math.round(Math.min(cover.x1 - cw, Math.max(cover.x0, cx - cw / 2)));
    return { left: x, top: cover.y0, width: cw, height: ch };
  }

  // Crops stay lossless (PNG buffers) until the single JPEG encode on write.
  async function cropPair(box, width, height) {
    const crop = (input) =>
      sharp(input)
        .extract(box)
        .resize(width, height, { fit: "fill", kernel: "lanczos3" })
        .png()
        .toBuffer();
    return Promise.all([crop(BEFORE), crop(afterAligned)]);
  }

  // Left half BEFORE, right half AFTER, with a divider line.
  async function split(before, after, width, height, divider, color) {
    const half = Math.round(width / 2);
    const rightHalf = await sharp(after)
      .extract({ left: half, top: 0, width: width - half, height })
      .toBuffer();
    const line = await sharp({
      create: { width: divider, height, channels: 3, background: color },
    })
      .png()
      .toBuffer();
    return sharp(before).composite([
      { input: rightHalf, left: half, top: 0 },
      { input: line, left: half - Math.floor(divider / 2), top: 0 },
    ]);
  }

  for (const v of VARIANTS) {
    const box = boxFor(v.aspect);
    const ch = box.height;
    console.log(
      `${v.name}: crop ${box.width}x${ch} at (${box.left},${box.top}) in BEFORE pixels ` +
        `-> ${v.width}x${v.height} (scale x${(v.height / ch).toFixed(2)} from BEFORE, ` +
        `x${((v.height / ch) * (placedH / afterMeta.height)).toFixed(2)} from AFTER's native pixels)`
    );

    const [beforeCrop, afterCrop] = await cropPair(box, v.width, v.height);
    await sharp(beforeCrop).jpeg(JPEG).toFile(join(OUT, `hero-${v.name}-before.jpg`));
    await sharp(afterCrop).jpeg(JPEG).toFile(join(OUT, `hero-${v.name}-after.jpg`));

    if (!PROOFS) continue;
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

    await (await split(beforeCrop, afterCrop, v.width, v.height, 2, "#ff3b30"))
      .jpeg(JPEG)
      .toFile(join(OUT, `proof-${v.name}-split.jpg`));

    const translucent = await sharp(afterCrop).ensureAlpha(0.5).png().toBuffer();
    await sharp(beforeCrop)
      .composite([{ input: translucent, left: 0, top: 0 }])
      .jpeg(JPEG)
      .toFile(join(OUT, `proof-${v.name}-blend.jpg`));
  }

  // "How it works" step 3: the reveal, as a half-and-half split.
  {
    const { width, height } = STEP_REVEAL;
    const [b, af] = await cropPair(boxFor(width / height), width, height);
    await (await split(b, af, width, height, 2, CREAM))
      .jpeg(JPEG)
      .toFile(join(OUT, "step-reveal.jpg"));
    console.log(`step-reveal: ${width}x${height}`);
  }

  console.log(`wrote outputs to ${OUT}`);
}

await main();
