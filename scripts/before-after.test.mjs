// Slider behaviour tests: the re-centre rule on a look change and which stacked
// after image is exposed for a given activeIndex. Run: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsx = path.join(repo, "node_modules/tsx/dist/cli.mjs");

const script = `
  import { createElement } from "react";
  import { renderToStaticMarkup } from "react-dom/server";
  // tsx -e loads .ts/.tsx as CommonJS, so the namespace's default is the
  // module's exports object (and the component's is its .default).
  const { pctAfterLookChange } = (await import(${JSON.stringify(path.join(repo, "lib/beforeAfter.ts"))})).default;
  const C = (await import(${JSON.stringify(path.join(repo, "components/BeforeAfterSlider.tsx"))})).default.default;
  const afters = [{ src: "/a.jpg", alt: "A" }, { src: "/b.jpg", alt: "B" }, { src: "/c.jpg", alt: "C" }];
  const html = [0, 1, 2].map((i) => renderToStaticMarkup(createElement(C, { beforeSrc: "/x.jpg", beforeAlt: "X", afters, activeIndex: i, heightVariant: "storage" })));
  console.log(JSON.stringify({ pcts: [0, 50, 94, 95, 100].map(pctAfterLookChange), html }));
`;
const run = spawnSync(process.execPath, [tsx, "--input-type=module", "-e", script], { cwd: repo, encoding: "utf8" });
assert.equal(run.status, 0, run.stderr);
const out = JSON.parse(run.stdout.trim().split("\n").pop());

test("a divider at 95% or more re-centres on a look change, others stay put", () => {
  assert.deepEqual(out.pcts, [0, 50, 94, 50, 50]);
});

test("exactly the activeIndex after image is active and exposed", () => {
  out.html.forEach((h, i) => {
    const divs = [...h.matchAll(/<div class="(rr-ba-after[^"]*)"([^>]*)>/g)];
    assert.equal(divs.length, 3);
    divs.forEach((m, j) => {
      assert.equal(m[1].includes("rr-ba-after--active"), j === i);
      assert.equal(m[2].includes('aria-hidden="true"'), j !== i);
    });
  });
});

test("the slider surface isolates its stacking context", () => {
  assert.match(out.html[0], /isolation:isolate/);
});
