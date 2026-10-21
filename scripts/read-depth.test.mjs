// Read-depth threshold logic. Run: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsx = path.join(repo, "node_modules/tsx/dist/cli.mjs");
const script = `
  const m = (await import(${JSON.stringify(path.join(repo, "lib/readDepth.ts"))})).default;
  const { bodyProgressPct, newDepths, sectionAtDepth, contentHeight } = m;
  const cta = [{ top: 1000, height: 400 }];
  const h = [{ id: 'a', top: 100 }, { id: 'b', top: 1500 }, { id: 'c', top: 3000 }];
  console.log(JSON.stringify({
    pct: [bodyProgressPct(800, 4000, 800), bodyProgressPct(0, 4000, 800), bodyProgressPct(-3200, 4000, 800), bodyProgressPct(-9000, 4000, 800), bodyProgressPct(0, 0, 800)],
    a: newDepths(30, new Set()),
    b: newDepths(60, new Set([25])),
    c: newDepths(100, new Set([25, 50, 75, 100])),
    d: newDepths(99.6, new Set()),
    e: newDepths(10, new Set()),
    sec: [25, 50, 75, 100].map((d) => sectionAtDepth(h, d, 0, 4000, 800)),
    secNone: sectionAtDepth(h, 1, 0, 4000, 800),
    ctaTotal: contentHeight(0, 4000, cta),
    // range 0..4000 with a 400px CTA at 1000..1400 (content height 3600)
    ctaPct: [bodyProgressPct(0, 4000, 800, cta), bodyProgressPct(0, 4000, 1200, cta), bodyProgressPct(-600, 4000, 1000, [{ top: 400, height: 400 }]), bodyProgressPct(-3200, 4000, 800, cta)],
    moved: [bodyProgressPct(0, 4000, 2000, [{ top: 100, height: 400 }]), bodyProgressPct(0, 4000, 2000, [{ top: 1200, height: 400 }])],
    ctaOutside: contentHeight(0, 4000, [{ top: 5000, height: 300 }, { top: -200, height: 100 }]),
    ctaClipped: contentHeight(100, 1000, [{ top: 0, height: 200 }]),
    ctaSec: [25, 50, 75, 100].map((d) => sectionAtDepth(h, d, 0, 4000, 800, cta)),
    secEmpty: sectionAtDepth([], 100, 0, 4000, 800),
  }));
`;
const run = spawnSync(process.execPath, [tsx, "--input-type=module", "-e", script], { cwd: repo, encoding: "utf8" });
assert.equal(run.status, 0, run.stderr);
const out = JSON.parse(run.stdout.trim().split("\n").pop());

test("progress is the viewport bottom against the body, clamped 0-100", () => {
  assert.deepEqual(out.pct, [0, 20, 100, 100, 0]);
});

test("only newly crossed depths are returned", () => {
  assert.deepEqual(out.a, [25]);
  assert.deepEqual(out.b, [50]);
  assert.deepEqual(out.c, []);
  assert.deepEqual(out.d, [25, 50, 75, 100]);
  assert.deepEqual(out.e, []);
});

test("section is picked per depth at that depth's position", () => {
  // viewport top = d% of 4000 minus 800: 200, 1200, 2200, 3200
  assert.deepEqual(out.sec, ["a", "a", "b", "c"]);
  assert.equal(out.secNone, null);
  assert.equal(out.secEmpty, null);
});

test("a CTA inside the range is removed from scrolled px and total", () => {
  assert.equal(out.ctaTotal, 3600);
  // line above the CTA: unchanged px, smaller total -> 800/3600
  assert.ok(Math.abs(out.ctaPct[0] - (800 / 3600) * 100) < 1e-9);
  // line inside the CTA (1000..1400, line at 1200): only 1000 content px reached
  assert.ok(Math.abs(out.ctaPct[1] - (1000 / 3600) * 100) < 1e-9);
  // range starts 600 above the viewport, CTA fully above the line: (1600 - 400)/3600
  assert.ok(Math.abs(out.ctaPct[2] - (1200 / 3600) * 100) < 1e-9);
  // bottom of the range reaches exactly 100
  assert.equal(out.ctaPct[3], 100);
});

test("blocks outside the range are ignored and partial overlap is clipped", () => {
  assert.equal(out.ctaOutside, 4000);
  assert.equal(out.ctaClipped, 900);
});

test("CTA position does not change the percentage once it is above the line", () => {
  assert.equal(out.moved[0], out.moved[1]);
});

test("section uses the excluded-height coordinate system", () => {
  // content 3600: depths -> 900, 1800, 2700, 3600 content px. Mapped back
  // (CTA 1000..1400): 900, 2200, 3100, 4000; viewport top = that - 800.
  assert.deepEqual(out.ctaSec, ["a", "a", "b", "c"]);
});
