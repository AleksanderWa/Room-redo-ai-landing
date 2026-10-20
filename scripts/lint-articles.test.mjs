// Proves the article linter passes the good fixture and fails each broken one
// for the right reason. Run: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..");
const fixtures = path.join(here, "__fixtures__");
const tsx = path.join(repo, "node_modules/tsx/dist/cli.mjs");

function lint(name) {
  const res = spawnSync(
    process.execPath,
    [tsx, path.join(here, "lint-articles.mjs"), "--content-dir", fixtures, path.join(fixtures, "guides", `${name}.md`)],
    { cwd: repo, encoding: "utf8" },
  );
  return { code: res.status, out: res.stdout + res.stderr };
}

test("good fixture passes (warnings do not fail)", () => {
  const { code, out } = lint("fixture-good");
  assert.equal(code, 0, out);
  assert.match(out, /0 errors/);
});

test("a real photo opted out with the title \"photo\" passes", () => {
  const { code, out } = lint("good-photo-optout");
  assert.equal(code, 0, out);
});

const broken = [
  ["bad-em-dash", "em-dash"],
  ["bad-slug", "slug"],
  ["bad-missing-alt", "alt"],
  ["bad-banned-phrase", "banned"],
  ["bad-unknown-directive", "directive"],
  ["bad-cta-two-mid", "directive"],
  ["bad-cta-two-end", "directive"],
  ["bad-cta-end-not-last", "directive"],
  ["bad-cta-nested", "directive"],
  ["bad-link-ideas", "link"],
];

for (const [name, rule] of broken) {
  test(`${name} fails with [${rule}]`, () => {
    const { code, out } = lint(name);
    assert.equal(code, 1, out);
    assert.match(out, new RegExp(`\\[${rule}\\]`), out);
    assert.match(out, /1 error,/, `only the ${rule} check should fail:\n${out}`);
  });
}

test("body images are AI-labelled unless the title is \"photo\"", () => {
  const code = `
    const m = await import("${path.join(repo, "lib/content/image.ts")}");
    const f = (m.default ?? m).splitImageTitle;
    console.log(JSON.stringify([f(undefined), f("A caption"), f("photo"), f(" Photo ")]));
  `;
  const res = spawnSync(process.execPath, [tsx, "--input-type=module", "-e", code], { cwd: repo, encoding: "utf8" });
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(JSON.parse(res.stdout), [
    { isPhoto: false },
    { isPhoto: false, caption: "A caption" },
    { isPhoto: true },
    { isPhoto: true },
  ]);
});
