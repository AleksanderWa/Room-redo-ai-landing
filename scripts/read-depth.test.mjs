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
  const { bodyProgressPct, newDepths } = m;
  console.log(JSON.stringify({
    pct: [bodyProgressPct(800, 4000, 800), bodyProgressPct(0, 4000, 800), bodyProgressPct(-3200, 4000, 800), bodyProgressPct(-9000, 4000, 800), bodyProgressPct(0, 0, 800)],
    a: newDepths(30, new Set()),
    b: newDepths(60, new Set([25])),
    c: newDepths(100, new Set([25, 50, 75, 100])),
    d: newDepths(99.6, new Set()),
    e: newDepths(10, new Set()),
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
