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
  assert.equal(r.landSizes, "(min-width:720px) 672px, calc(100vw - 48px)");
  assert.equal(r.portSizes, "(min-width:528px) 480px, calc(100vw - 48px)");
  assert.equal(r.landHero, "(min-width:720px) 672px, 100vw");
  assert.equal(r.portHero, "(min-width:480px) 480px, 100vw");
});

test("quality 90 is allowed by next.config", async () => {
  const cfg = await import("node:fs").then((fs) => fs.readFileSync(path.join(repo, "next.config.ts"), "utf8"));
  const m = cfg.match(/qualities:\s*\[([^\]]*)\]/);
  assert.ok(m, "qualities set");
  assert.ok(m[1].split(",").map((s) => Number(s.trim())).includes(r.quality));
});
