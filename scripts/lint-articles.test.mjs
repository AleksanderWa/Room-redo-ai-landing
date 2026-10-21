// Proves the article linter passes the good fixture and fails each broken one
// for the right reason. Run: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..");
const fixtures = path.join(here, "__fixtures__");
const tsx = path.join(repo, "node_modules/tsx/dist/cli.mjs");

function lint(name, dir = fixtures) {
  const res = spawnSync(
    process.execPath,
    [tsx, path.join(here, "lint-articles.mjs"), "--content-dir", dir, path.join(dir, "guides", `${name}.md`)],
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

test("a link to a published ideas article passes now that ideas is published", () => {
  const { code, out } = lint("good-link-ideas");
  assert.equal(code, 0, out);
  assert.match(out, /0 errors/);
});

test("a link to the /ideas hub passes when a published ideas article exists", () => {
  const { code, out } = lint("good-link-ideas-hub");
  assert.equal(code, 0, out);
  assert.match(out, /0 errors/);
});

// The hub 404s until ideas has a published article, so linking to it must fail.
for (const dir of ["__fixtures_no-ideas", "__fixtures_draft-only-ideas"]) {
  test(`a link to /ideas fails with [link] when ideas has no published article (${dir})`, () => {
    const { code, out } = lint("bad-link-ideas-hub", path.join(here, dir));
    assert.equal(code, 1, out);
    assert.match(out, /\[link\].*\/ideas/, out);
    assert.match(out, /1 error,/, out);
  });
}

test("hasPublished is true only for a published type with at least one article", () => {
  const code = `
    const m = await import("${path.join(repo, "lib/content/load.ts")}");
    const f = m.hasPublished ?? m.default.hasPublished;
    console.log(JSON.stringify([f("guides"), f("ideas")]));
  `;
  const res = spawnSync(process.execPath, [tsx, "--input-type=module", "-e", code], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production" },
  });
  assert.equal(res.status, 0, res.stderr);
  const [guides, ideas] = JSON.parse(res.stdout);
  const hasMd = (t) => fs.readdirSync(path.join(repo, "content", t)).some((f) => f.endsWith(".md"));
  assert.equal(guides, hasMd("guides"));
  assert.equal(ideas, hasMd("ideas"));
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
  ["bad-link-draft", "link"],
  ["bad-link-ideas-draft", "link"],
];

for (const [name, rule] of broken) {
  test(`${name} fails with [${rule}]`, () => {
    const { code, out } = lint(name);
    assert.equal(code, 1, out);
    assert.match(out, new RegExp(`\\[${rule}\\]`), out);
    assert.match(out, /1 error,/, `only the ${rule} check should fail:\n${out}`);
  });
}

test("a FAQ more.href that does not resolve fails with [faq]", () => {
  const res = spawnSync(
    process.execPath,
    [tsx, path.join(here, "lint-articles.mjs"), "--faq-file", path.join(fixtures, "faq-bad.ts")],
    { cwd: repo, encoding: "utf8" },
  );
  const out = res.stdout + res.stderr;
  assert.equal(res.status, 1, out);
  assert.match(out, /\[faq\].*\/guides\/no-such-article/, out);
});

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
