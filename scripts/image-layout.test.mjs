// Article image layout: the frame follows the file's real shape and `sizes`
// matches the rendered width. Run: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsx = path.join(repo, "node_modules/tsx/dist/cli.mjs");

const script = `
  const L = (await import(${JSON.stringify(path.join(repo, "lib/content/imageLayout.ts"))})).default;
  const S = (await import(${JSON.stringify(path.join(repo, "lib/content/imageSize.ts"))})).default;
  const land = S.readImageSize("/images/articles/japandi-bedroom-living-room/attic-bedroom-before.webp");
  const port = S.readImageSize("/images/articles/japandi-bedroom-living-room/old-town-living-room-before.webp");
  let missing = "";
  try { S.readImageSize("/images/nope.webp"); } catch (e) { missing = e.code ?? e.message; }
  console.log(JSON.stringify({
    land, port, missing,
    landAspect: L.aspectRatioOf(land), portAspect: L.aspectRatioOf(port),
    landO: L.orientationOf(land), portO: L.orientationOf(port),
    landSizes: L.sizesFor(land), portSizes: L.sizesFor(port),
    landHero: L.heroSizesFor(land), portHero: L.heroSizesFor(port),
    square: L.orientationOf({ width: 5, height: 5 }),
    quality: L.ARTICLE_IMAGE_QUALITY,
    step: L.stepSizes, row2: L.styleRowSizes(2), row3: L.styleRowSizes(3), row4: L.styleRowSizes(4),
  }));
`;
const run = spawnSync(process.execPath, [tsx, "--input-type=module", "-e", script], { cwd: repo, encoding: "utf8" });
assert.equal(run.status, 0, run.stderr);
const r = JSON.parse(run.stdout.trim().split("\n").pop());

test("dimensions are read from the real files", () => {
  assert.deepEqual(r.land, { width: 1600, height: 1200 });
  assert.deepEqual(r.port, { width: 704, height: 944 });
  assert.ok(r.missing, "a missing file throws");
});

test("frame aspect equals the image aspect (no crop)", () => {
  assert.equal(r.landAspect, "1600 / 1200");
  assert.equal(r.portAspect, "704 / 944");
  assert.equal(r.landO, "landscape");
  assert.equal(r.portO, "portrait");
  assert.equal(r.square, "portrait");
});

test("sizes: landscape fills the 672px column, portrait is capped at 480px", () => {
  assert.equal(r.landSizes, "(min-width:720px) 656px, (min-width:700px) calc(100vw - 64px), calc(100vw - 48px)");
  assert.equal(r.portSizes, "(min-width:528px) 480px, calc(100vw - 48px)");
  assert.equal(r.landHero, "(min-width:720px) 656px, (min-width:700px) calc(100vw - 64px), 100vw");
  assert.equal(r.portHero, "(min-width:700px) 480px, 100vw");
});

test("quality 90 is allowed by next.config", async () => {
  const cfg = await import("node:fs").then((fs) => fs.readFileSync(path.join(repo, "next.config.ts"), "utf8"));
  const m = cfg.match(/qualities:\s*\[([^\]]*)\]/);
  assert.ok(m, "qualities set");
  assert.ok(m[1].split(",").map((s) => Number(s.trim())).includes(r.quality));
});

// Resolve a `sizes` string at a viewport width, as the browser does.
function resolve(sizes, vw) {
  for (const part of sizes.split(/,(?![^(]*\))/)) {
    const m = part.trim().match(/^(?:\(min-width:(\d+)px\)\s+)?(.+)$/);
    if (m[1] && vw < Number(m[1])) continue;
    const v = m[2].trim();
    const calc = v.match(/^calc\(100vw - (\d+)px\)$/);
    if (calc) return vw - Number(calc[1]);
    const div = v.match(/^calc\(\(100vw - (\d+)px\) \/ (\d+)\)$/);
    if (div) return (vw - Number(div[1])) / Number(div[2]);
    if (v === "100vw") return vw;
    return Number(v.replace("px", ""));
  }
}

// Real rendered widths from app/globals.css: padding 24px (<700) / 32px (>=700),
// column max 720; hero full-bleed <700; portrait cap 480 (body: always, hero: >=700).
const bodyWidth = (vw, portrait) => {
  const content = Math.min(vw, 720) - (vw < 700 ? 48 : 64);
  return portrait ? Math.min(content, 480) : content;
};
const heroWidth = (vw, portrait) => {
  const full = vw < 700 ? vw : Math.min(vw, 720) - 64;
  return portrait && vw >= 700 ? Math.min(full, 480) : full;
};

// Step card: 48 page + 2 border + 32 card padding + 36 badge + 14 gap below 700px;
// image max-width 360 from 700px (card column is wider than that there).
const stepWidth = (vw) => (vw < 700 ? vw - 132 : 360);
// Style row: 10px gap (<700) / 16px (>=700); 2 columns for 2 or 4 styles below 700px.
const rowWidth = (vw, n) => {
  const narrow = vw < 700;
  const cols = narrow && n === 4 ? 2 : n;
  const content = Math.min(vw, 720) - (narrow ? 48 : 64);
  return (content - (narrow ? 10 : 16) * (cols - 1)) / cols;
};

test("step and style-row sizes match the CSS at every viewport", () => {
  for (let vw = 320; vw <= 1600; vw += 1) {
    assert.equal(resolve(r.step, vw), stepWidth(vw), `step @${vw}`);
    assert.equal(resolve(r.row2, vw), rowWidth(vw, 2), `row2 @${vw}`);
    assert.equal(resolve(r.row3, vw), rowWidth(vw, 3), `row3 @${vw}`);
    assert.equal(resolve(r.row4, vw), rowWidth(vw, 4), `row4 @${vw}`);
  }
});

test("sizes agree with the CSS breakpoints at every viewport (600px included)", () => {
  assert.equal(resolve(r.portHero, 600), 600, "portrait hero is 100vw at 600px");
  for (let vw = 320; vw <= 1600; vw += 1) {
    assert.equal(resolve(r.landSizes, vw), bodyWidth(vw, false), `land body @${vw}`);
    assert.equal(resolve(r.portSizes, vw), bodyWidth(vw, true), `port body @${vw}`);
    assert.equal(resolve(r.landHero, vw), heroWidth(vw, false), `land hero @${vw}`);
    assert.equal(resolve(r.portHero, vw), heroWidth(vw, true), `port hero @${vw}`);
  }
});
