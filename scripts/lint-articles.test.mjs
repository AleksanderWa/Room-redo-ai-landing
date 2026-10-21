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

// Uses fixture content dirs (read.ts honours CONTENT_DIR), never the real
// content/, so the result does not depend on which articles exist today.
function hasPublishedIn(dir) {
  const code = `
    const m = await import("${path.join(repo, "lib/content/load.ts")}");
    const f = m.hasPublished ?? m.default.hasPublished;
    console.log(JSON.stringify([f("guides"), f("ideas")]));
  `;
  const res = spawnSync(process.execPath, [tsx, "--input-type=module", "-e", code], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", CONTENT_DIR: dir },
  });
  assert.equal(res.status, 0, res.stderr);
  return JSON.parse(res.stdout);
}

test("hasPublished: ideas is true with a published article, false when absent or draft-only", () => {
  assert.equal(hasPublishedIn(path.join(here, "__fixtures_published-ideas"))[1], true, "published ideas");
  assert.equal(hasPublishedIn(path.join(here, "__fixtures_draft-only-ideas"))[1], false, "draft-only");
  assert.equal(hasPublishedIn(path.join(here, "__fixtures_no-ideas"))[1], false, "no ideas dir");
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

// Link graph: each case is a content dir under __fixtures__/link-graph/.
function lintGraph(name, faq = "faq-empty.ts") {
  const dir = path.join(fixtures, "link-graph", name);
  const res = spawnSync(
    process.execPath,
    [tsx, path.join(here, "lint-articles.mjs"), "--content-dir", dir, "--faq-file", path.join(fixtures, "link-graph", faq), "--link-graph"],
    { cwd: repo, encoding: "utf8" },
  );
  return { code: res.status, out: res.stdout + res.stderr };
}

test("link graph: an orphan article fails with [link-graph]", () => {
  const { code, out } = lintGraph("orphan");
  assert.equal(code, 1, out);
  assert.match(out, /\[link-graph\].*no contextual inbound/, out);
  assert.match(out, /1 error,/, out);
});

test("link graph: one inbound link warns but passes", () => {
  const { code, out } = lintGraph("one-inbound");
  assert.equal(code, 0, out);
  assert.match(out, /\[link-graph\].*1 contextual inbound link/, out);
  assert.match(out, /0 errors/, out);
});

test("link graph: two inbound links per article is clean", () => {
  const { code, out } = lintGraph("clean");
  assert.equal(code, 0, out);
  assert.doesNotMatch(out, /\[link-graph\]/, out);
});

test("link graph: the check is off without --link-graph", () => {
  const dir = path.join(fixtures, "link-graph/orphan");
  const res = spawnSync(
    process.execPath,
    [tsx, path.join(here, "lint-articles.mjs"), "--content-dir", dir, "--faq-file", path.join(fixtures, "link-graph/faq-empty.ts")],
    { cwd: repo, encoding: "utf8" },
  );
  assert.equal(res.status, 0, res.stdout + res.stderr);
});

// Trailing slash, hash, query, absolute www URL and an /ideas/ target all
// count. gamma's only other inbound is an absolute FAQ href, so without the
// FAQ it would warn about 1 inbound link.
test("link graph: URL variants and an absolute FAQ href count as inbound", () => {
  const { code, out } = lintGraph("normalize", "faq-absolute.ts");
  assert.equal(code, 0, out);
  assert.doesNotMatch(out, /contextual inbound/, out);
});

test("link graph: without the FAQ href gamma has only one inbound link", () => {
  const { code, out } = lintGraph("normalize");
  assert.equal(code, 0, out);
  assert.match(out, /ideas\/gamma[\s\S]*1 contextual inbound link/, out);
});
