// Tests for the visual blocks: every container directive and ::pricing, the
// FAQ, tables, typed prices, and the rhythm rules (good and bad cases).
// Run: `npm test`.
//
// Directive, FAQ and table cases are variants of the good fixture
// (scripts/__fixtures__/guides/fixture-good.md, which uses every block), built
// in a temp folder and linted in one run. Rhythm cases call rhythmIssues on
// small generated documents, in one tsx run, so word counts are exact.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..");
const tsx = path.join(repo, "node_modules/tsx/dist/cli.mjs");
const good = fs.readFileSync(path.join(here, "__fixtures__/guides/fixture-good.md"), "utf8");

// ---------------------------------------------------------------- variants

const GLANCE = good.match(/:::at-a-glance[\s\S]*?\n:::\n/)[0];
const STEPS = good.match(/:::steps[\s\S]*?\n:::\n/)[0];
const LOOKS = good.match(/:::looks[\s\S]*?\n:::\n/)[0];
const TIP = good.match(/:::tip[\s\S]*?\n:::\n/)[0];
const NOTE = good.match(/:::note[\s\S]*?\n:::\n/)[0];
const PRICING = "::pricing\n";
const LOOK_JAPANDI = '![AI redesign of the bedroom in Japandi style, with low pale wood furniture](/images/styles/japandi.jpg "Japandi")';
const LOOK_BOHEMIAN = '![AI redesign of the bedroom in Bohemian style, with layered textiles](/images/styles/bohemian.jpg "Bohemian")';

const swap = (src, from, to) => {
  assert.ok(src.includes(from), `fixture no longer contains: ${from.slice(0, 60)}`);
  return src.replace(from, to);
};
const words = (n) => Array.from({ length: n }, () => "word").join(" ");

// name -> (src) => modified src. [expected rule, message regex, expected error count]
const variants = {
  // ::pricing
  "pr-groups": { edit: (s) => swap(s, PRICING, '::pricing{groups="plans packs"}\n') },
  "pr-groups-comma": { edit: (s) => swap(s, PRICING, '::pricing{groups="plans, packs"}\n') },
  "pr-footnote-off": { edit: (s) => swap(s, PRICING, '::pricing{footnote="off"}\n') },
  "pr-bad-group": { edit: (s) => swap(s, PRICING, '::pricing{groups="plans yearly"}\n'), rule: "directive", re: /unknown group "yearly"/ },
  "pr-empty": { edit: (s) => swap(s, PRICING, '::pricing{groups="yearly"}\n'), rule: "directive", re: /unknown group "yearly"/, extra: true },
  "pr-bad-footnote": { edit: (s) => swap(s, PRICING, '::pricing{footnote="short"}\n'), rule: "directive", re: /footnote can only be "off"/ },
  "pr-bad-attr": { edit: (s) => swap(s, PRICING, "::pricing{price=\"1\"}\n"), rule: "directive", re: /does not take "price"/ },
  "pr-container": { edit: (s) => swap(s, PRICING, ":::pricing\n:::\n"), rule: "directive", re: /must be a leaf directive/ },
  "pr-typed-price": {
    edit: (s) => swap(s, "Keep the desk away from the bed if you can.", "Keep the desk away from the bed for $5 if you can."),
    rule: "price",
    re: /typed price/,
  },
  "pr-repeats-note": {
    edit: (s) => swap(s, "The free redesign is the easy way", "Plans renew until you cancel. The free redesign is the easy way"),
    rule: "rhythm",
    re: /repeats the footnote/,
  },
  "pr-repeats-ok-off": {
    edit: (s) =>
      swap(swap(s, PRICING, '::pricing{footnote="off"}\n'), "The free redesign is the easy way", "Plans renew until you cancel. The free redesign is the easy way"),
  },
  // :::at-a-glance
  "gl-two-items": {
    edit: (s) => swap(s, GLANCE, ":::at-a-glance\n- Room: Nine feet wide\n- Start with: The bed\n:::\n"),
    rule: "directive",
    re: /needs 3 to 5 items, found 2/,
  },
  "gl-six-items": {
    edit: (s) => swap(s, GLANCE, GLANCE.replace("\n:::\n", "\n- Extra: One\n- More: Two\n:::\n")),
    rule: "directive",
    re: /needs 3 to 5 items, found 6/,
  },
  "gl-no-colon": {
    edit: (s) => swap(s, "- Cost: Free to try", "- Free to try"),
    rule: "directive",
    re: /item 4 must be "Label: value"/,
  },
  "gl-long-label": {
    edit: (s) => swap(s, "- Cost:", "- A much too long label:"),
    rule: "directive",
    re: /label .* is over 14 characters/,
  },
  "gl-long-value": {
    edit: (s) => swap(s, "- Cost: Free to try", "- Cost: A value that is far too long to fit"),
    rule: "directive",
    re: /value is over 34 characters/,
  },
  "gl-empty-value": {
    edit: (s) => swap(s, "- Cost: Free to try", "- Cost:"),
    rule: "directive",
    re: /needs both a label and a value/,
  },
  "gl-title": { edit: (s) => swap(s, ":::at-a-glance\n", ':::at-a-glance{title="Quick facts"}\n') },
  "gl-leaf": {
    edit: (s) => swap(s, GLANCE, "::at-a-glance\n"),
    rule: "directive",
    re: /must be a container directive/,
    extra: true,
  },
  "gl-link-value": { edit: (s) => swap(s, "- Cost: Free to try", "- Cost: [Free](/privacy)") },
  "gl-missing": {
    edit: (s) => swap(s, GLANCE, ""),
    rule: "rhythm",
    re: /needs an :::at-a-glance/,
    extra: true,
  },
  // :::steps
  "st-one-item": {
    edit: (s) => swap(s, STEPS, ":::steps\n1. **Measure the room.** Note the bed, the door swing and the walk path.\n:::\n"),
    rule: "directive",
    re: /needs 2 to 5 items, found 1/,
  },
  "st-six-items": {
    edit: (s) => swap(s, STEPS, STEPS.replace("\n:::\n", "\n6. **One more.** A sixth step.\n:::\n")),
    rule: "directive",
    re: /needs 2 to 5 items, found 6/,
  },
  "st-no-bold": {
    edit: (s) => swap(s, "3. **Place the bed first.** Then", "3. Place the bed first. Then"),
    rule: "directive",
    re: /item 3 must start with a bold title/,
  },
  "st-long-title": {
    edit: (s) => swap(s, "**Place the bed first.**", "**Place the bed first, before anything else in the room.**"),
    rule: "directive",
    re: /item 3 title is over 40 characters/,
  },
  "st-long-line": {
    edit: (s) => swap(s, "Then the wardrobe, then the lighting.", `Then ${words(30)} the end.`),
    rule: "directive",
    re: /item 3 line is over 120 characters/,
  },
  "st-no-line": {
    edit: (s) => swap(s, "**Place the bed first.** Then the wardrobe, then the lighting.", "**Place the bed first.**"),
    rule: "directive",
    re: /item 3 needs a one-line description/,
  },
  "st-second-para": {
    edit: (s) => swap(s, "3. **Place the bed first.** Then the wardrobe, then the lighting.", "3. **Place the bed first.** Then the wardrobe, then the lighting.\n\n   A second paragraph that does not belong."),
    rule: "directive",
    re: /item 3 may only add one image/,
  },
  "st-bullets": {
    edit: (s) => swap(s, STEPS, STEPS.replace(/^\d\. /gm, "- ")),
    rule: "directive",
    re: /must contain a numbered/,
  },
  "st-photo-image": {
    edit: (s) => swap(s, "(/images/hero-after.jpg)\n3.", '(/images/hero-after.jpg "photo")\n3.'),
  },
  "st-image-no-blank-line": {
    edit: (s) => swap(s, "\n\n   ![AI redesign of a bedroom with a clear walk path in a calm style]", "\n   ![AI redesign of a bedroom with a clear walk path in a calm style]"),
    rule: "directive",
    re: /item \d has an image directly under its text; put a blank line before the image/,
  },
  "st-missing-alt": {
    edit: (s) => swap(s, "![AI redesign of a bedroom with a clear walk path in a calm style]", "![]"),
    rule: "alt",
    re: /has no alt text/,
  },
  "st-leaf": {
    edit: (s) => swap(s, STEPS, "::steps\n"),
    rule: "directive",
    re: /must be a container directive/,
  },
  // :::looks
  "lk-no-before": {
    edit: (s) => swap(s, LOOKS, `:::looks\n${LOOK_JAPANDI}\n${LOOK_BOHEMIAN}\n:::\n`),
  },
  "lk-four-no-before": {
    edit: (s) =>
      swap(s, LOOKS, `:::looks\n${LOOK_JAPANDI}\n${LOOK_BOHEMIAN}\n${LOOK_JAPANDI.replace('"Japandi"', '"Japandi 2"')}\n${LOOK_BOHEMIAN.replace('"Bohemian"', '"Bohemian 2"')}\n:::\n`),
  },
  "lk-one-look": {
    edit: (s) => swap(s, LOOKS, `:::looks\n${LOOK_JAPANDI}\n:::\n`),
    rule: "directive",
    re: /needs 2 to 4 looks, found 1/,
  },
  "lk-five-with-before": {
    edit: (s) =>
      swap(s, LOOKS, LOOKS.replace("\n:::\n", `\n${LOOK_JAPANDI.replace('"Japandi"', '"Japandi 2"')}\n${LOOK_BOHEMIAN.replace('"Bohemian"', '"Bohemian 2"')}\n:::\n`)),
    rule: "directive",
    re: /needs 2 to 3 looks when it has a before image, found 4/,
  },
  "lk-no-title": {
    edit: (s) => swap(s, '/images/styles/japandi.jpg "Japandi")', "/images/styles/japandi.jpg)"),
    rule: "directive",
    re: /image 1 needs a title with the style name/,
  },
  "lk-photo-title": {
    edit: (s) => swap(s, '"Japandi")', '"photo")'),
    rule: "directive",
    re: /"photo" is not allowed here/,
  },
  "lk-long-title": {
    edit: (s) => swap(s, '"Japandi")', '"A style name that is far too long")'),
    rule: "directive",
    re: /style name is over 24 characters/,
  },
  "lk-before-no-alt": {
    edit: (s) => swap(s, ' beforeAlt="A cluttered bedroom before any changes" caption', " caption"),
    rule: "directive",
    re: /needs both before and beforeAlt/,
  },
  "lk-text-inside": {
    edit: (s) => swap(s, LOOKS, LOOKS.replace("\n:::\n", "\nSome stray text.\n:::\n")),
    rule: "directive",
    re: /images only/,
  },
  "lk-missing-before-file": {
    edit: (s) => swap(s, 'before="/images/hero-before.jpg" beforeAlt="A cluttered bedroom before any changes" caption=', 'before="/images/nope.jpg" beforeAlt="A cluttered bedroom before any changes" caption='),
    rule: "image",
    re: /::looks before image not found/,
  },
  // :::tip and :::note
  "co-tip-title": { edit: (s) => swap(s, ":::tip\n", ':::tip{title="Try this"}\n') },
  "co-list": {
    edit: (s) => swap(s, TIP, ":::tip\n- Stand in the doorway.\n- Look at the walls.\n:::\n"),
  },
  "co-empty": {
    edit: (s) => swap(s, TIP, ":::tip\n:::\n"),
    rule: "directive",
    re: /:::tip is empty/,
  },
  "co-long-warn": {
    edit: (s) => swap(s, NOTE, `:::note\n${words(50)}.\n:::\n`),
    warn: /:::note is 5\d words/,
  },
  "co-too-long": {
    edit: (s) => swap(s, NOTE, `:::note\n${words(75)}.\n:::\n`),
    rule: "directive",
    re: /:::note is 7\d words/,
  },
  "co-heading": {
    edit: (s) => swap(s, TIP, ":::tip\n### A heading\n\nText.\n:::\n"),
    rule: "directive",
    re: /one short paragraph or a short list only \(found heading\)/,
  },
  "co-image": {
    edit: (s) => swap(s, TIP, ":::tip\n![AI redesign of a bedroom](/images/hero-after.jpg)\n:::\n"),
    rule: "directive",
    re: /may not contain images/,
  },
  "co-two-paras": {
    edit: (s) => swap(s, TIP, ":::tip\nOne.\n\nTwo.\n:::\n"),
    rule: "directive",
    re: /not several blocks/,
  },
  "co-title-over": {
    edit: (s) => swap(s, ':::note{title="Good to know"}', ':::note{title="A callout title that is far too long"}'),
    rule: "directive",
    re: /title is over 24 characters/,
  },
  "co-unknown": {
    edit: (s) => swap(s, TIP, TIP.replace(":::tip", ":::warning")),
    rule: "directive",
    re: /unknown directive "warning"/,
  },
  // FAQ
  "fq-none": {
    edit: (s) => s.replace(/faq:\n(  .*\n)+/, ""),
  },
  "fq-two-warns": {
    edit: (s) => swap(s, '  - q: "Does a mirror really help a small bedroom?"\n    a: "It can, if it faces the window. Put it on the wall that gets the light."\n', ""),
    warn: /faq has 2 item/,
  },
  "fq-no-question-mark": {
    edit: (s) => swap(s, "Do I need to measure the room first?", "Do I need to measure the room first."),
    rule: "faq",
    re: /question mark/,
  },
  "fq-markdown-q": {
    edit: (s) => swap(s, "Do I need to measure the room first?", "Do I need to **measure** the room first?"),
    rule: "faq",
    re: /plain text/,
  },
  "fq-repeats-h2": {
    edit: (s) => swap(s, "Do I need to measure the room first?", "Where should the bed go?"),
    rule: "faq",
    re: /repeats an H2/,
  },
  "fq-list-answer": {
    edit: (s) => swap(s, '"A rough sketch is enough. Measure the bed, the door swing and the walk path, and you have what you need."', '"- One\\n- Two"'),
    rule: "faq",
    re: /inline markdown only/,
  },
  "fq-image-answer": {
    edit: (s) => swap(s, "A rough sketch is enough.", "![x](/images/hero-after.jpg) A rough sketch is enough."),
    rule: "faq",
    re: /cannot contain images/,
  },
  "fq-long-answer": {
    edit: (s) => swap(s, "A rough sketch is enough.", `${words(75)}.`),
    rule: "schema",
    re: /faq\.0\.a: faq a is over 70 words/,
  },
  "fq-nine-items": {
    edit: (s) =>
      swap(s, "draft: false", `${Array.from({ length: 6 }, (_, i) => `  - q: "Extra question ${i}?"\n    a: "Short answer ${i}."\n`).join("")}draft: false`),
    rule: "schema",
    re: /at most 8 FAQ items/,
  },
  "fq-eight-items": {
    edit: (s) =>
      swap(s, "draft: false", `${Array.from({ length: 5 }, (_, i) => `  - q: "Extra question ${i}?"\n    a: "Short answer ${i}."\n`).join("")}draft: false`),
  },
  "fq-missing-a": {
    edit: (s) => swap(s, '    a: "It can, if it faces the window. Put it on the wall that gets the light."\n', ""),
    rule: "schema",
    re: /faq\.2\.a/,
  },
  "fq-price": {
    edit: (s) => swap(s, "A rough sketch is enough.", "A rough sketch, about $20 of tape, is enough."),
    rule: "price",
    re: /typed price in the faq/,
  },
  // tables
  "tb-empty-header": {
    edit: (s) => swap(s, "| Bed position | Floor saved | Best for | Watch out for |", "| Bed position | Floor saved | | Watch out for |"),
    rule: "table",
    re: /column 3 has no header/,
  },
  "tb-six-columns": {
    edit: (s) => swap(s, "| Bed position | Floor saved | Best for | Watch out for |\n|---|---|---|---|", "| Bed position | Floor saved | Best for | Watch out for | A | B |\n|---|---|---|---|---|---|"),
    warn: /table has 6 columns/,
    rows: true,
  },
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rr-lint-blocks-"));
fs.mkdirSync(path.join(tmp, "guides"));
for (const [name, v] of Object.entries(variants)) {
  let src = swap(good, "slug: fixture-good", `slug: ${name}`);
  src = v.edit(src);
  fs.writeFileSync(path.join(tmp, "guides", `${name}.md`), src);
}
fs.writeFileSync(path.join(tmp, "guides", "fixture-good.md"), good);

const run = spawnSync(process.execPath, [tsx, path.join(here, "lint-articles.mjs"), "--content-dir", tmp], {
  cwd: repo,
  encoding: "utf8",
});
const report = {};
{
  let cur = null;
  for (const line of (run.stdout + run.stderr).split("\n")) {
    const f = line.match(/guides\/([\w-]+)\.md$/);
    if (f) {
      cur = f[1];
      report[cur] = { errors: [], warns: [] };
      continue;
    }
    const m = line.match(/^ {2}(error|warn ) \[(\w+)\](?: line \d+)?: (.*)$/);
    if (m && cur) report[cur][m[1] === "error" ? "errors" : "warns"].push({ rule: m[2], message: m[3] });
  }
}
const result = (name) => report[name] ?? { errors: [], warns: [] };

test("the good fixture (every block) passes", () => {
  assert.deepEqual(result("fixture-good").errors, []);
});

for (const [name, v] of Object.entries(variants)) {
  if (v.rule) {
    test(`${name} fails with [${v.rule}]`, () => {
      const r = result(name);
      assert.ok(
        r.errors.some((e) => e.rule === v.rule && v.re.test(e.message)),
        `expected [${v.rule}] ${v.re}, got ${JSON.stringify(r)}`,
      );
      if (!v.extra) assert.equal(r.errors.length, 1, `only that check should fail: ${JSON.stringify(r.errors)}`);
    });
  } else if (v.warn) {
    test(`${name} warns but passes`, () => {
      const r = result(name);
      assert.deepEqual(r.errors, []);
      assert.ok(r.warns.some((w) => v.warn.test(w.message)), `expected warning ${v.warn}, got ${JSON.stringify(r.warns)}`);
    });
  } else {
    test(`${name} passes`, () => {
      assert.deepEqual(result(name).errors, []);
    });
  }
}

test("a ::pricing that leaves no group warns 'empty ::pricing'", () => {
  assert.ok(result("pr-empty").warns.some((w) => /empty ::pricing/.test(w.message)), JSON.stringify(result("pr-empty")));
  assert.ok(!result("fixture-good").warns.some((w) => /empty ::pricing/.test(w.message)));
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

// ----------------------------------------------------------------- rhythm

const p = (n) => `${words(n)}.\n\n`;
const TABLE = "| A | B |\n|---|---|\n| 1 | 2 |\n\n";
const GL = ":::at-a-glance\n- A: 1\n- B: 2\n- C: 3\n:::\n\n";
const TIPB = ":::tip\nShort advice.\n:::\n\n";
const IMG = "![AI redesign](/images/hero-after.jpg)\n\n";
const list = (n, each = 5) => Array.from({ length: n }, (_, i) => `- ${words(each)} ${i}`).join("\n") + "\n\n";
const h2 = (t) => `## ${t}\n\n`;
const STEPSB = ":::steps\n1. **One.** Line.\n2. **Two.** Line.\n:::\n\n";

// Documents that pass every rule, as a base to break one rule at a time.
const base = (...parts) => parts.join("");
const ok = base(p(40), GL, h2("First"), p(60), TABLE, p(60), STEPSB, p(60));

const rhythmCases = {
  // rule 1
  "r1-good": { md: base(p(40), GL, p(230), TABLE, h2("A"), p(60), STEPSB, p(30)), rule: "words of text in a row", expect: "none" },
  "r1-warn": { md: base(p(40), GL, p(300), TABLE, STEPSB, p(30)), rule: "words of text in a row", expect: "warn" },
  "r1-fail": { md: base(p(40), GL, p(400), TABLE, STEPSB, p(30)), rule: "words of text in a row", expect: "error" },
  "r1-headings-do-not-reset": { md: base(p(40), GL, p(150), h2("A"), p(150), TABLE, STEPSB), rule: "words of text in a row", expect: "warn" },
  "r1-block-resets": { md: base(p(40), GL, p(200), TABLE, p(200), STEPSB, p(200)), rule: "words of text in a row", expect: "none" },
  "r1-tail-run": { md: base(p(40), GL, TABLE, STEPSB, p(400)), rule: "words of text in a row", expect: "error" },
  // rule 2
  "r2-good": { md: base(p(150), GL, TABLE, STEPSB), rule: "first visual block", expect: "none" },
  "r2-late": { md: base(p(120), p(120), GL, TABLE, STEPSB), rule: "first visual block", expect: "error" },
  "r2-table-first-ok": { md: base(p(100), TABLE, p(40), GL, STEPSB), rule: "first visual block", expect: "none" },
  // rule 3
  "r3-good": { md: ok, rule: "needs at least|needs an|guide of", expect: "none" },
  "r3-no-table": { md: base(p(40), GL, p(60), STEPSB), rule: "needs at least one table", expect: "error" },
  "r3-pricing-counts": { md: base(p(40), GL, p(60), "::pricing\n\n", p(20), STEPSB), rule: "needs at least one table", expect: "none" },
  "r3-no-glance": { md: base(p(40), TABLE, p(60), STEPSB), rule: "needs an :::at-a-glance", expect: "error" },
  "r3-long-no-steps": { md: base(p(40), GL, p(300), TABLE, p(300), TABLE.replace("| 1 | 2 |", "| 3 | 4 |"), p(300)), rule: "guide of", expect: "error", type: "guides" },
  "r3-looks-counts": {
    md: base(p(40), GL, p(300), TABLE, p(300), ":::looks\n![a](/a.webp \"X\")\n![b](/b.webp \"Y\")\n:::\n\n", p(250)),
    rule: "guide of",
    expect: "none",
  },
  "r3-short-no-steps-ok": { md: base(p(40), GL, p(60), TABLE, p(60)), rule: "guide of", expect: "none" },
  "r3-ideas-exempt": { md: base(p(40), GL, p(300), TABLE, p(300), IMG.replace("hero", "x"), p(250)), rule: "guide of", expect: "none", type: "ideas" },
  // rule 4
  "r4-one-tip-ok": { md: base(ok, TIPB, p(20)), rule: ":::tip or :::note blocks", expect: "none", words: 900 },
  "r4-two-tips-900-words": { md: base(p(40), GL, p(100), TIPB, p(100), TIPB, p(100), TABLE, STEPSB), rule: ":::tip or :::note blocks", expect: "error", words: 900 },
  "r4-two-tips-1000-words-ok": { md: base(p(40), GL, p(100), TIPB, p(100), TIPB, p(100), TABLE, STEPSB), rule: ":::tip or :::note blocks", expect: "none", words: 1000 },
  "r4-four-tips-capped": { md: base(p(40), GL, TABLE, p(50), TIPB, p(50), TIPB, p(50), TIPB, p(50), TIPB, STEPSB), rule: ":::tip or :::note blocks", expect: "error", words: 5000 },
  "r4-two-glance": { md: base(p(40), GL, p(40), GL, TABLE, STEPSB), rule: "more than one :::at-a-glance", expect: "error" },
  "r4-two-pricing": { md: base(p(40), GL, p(40), "::pricing\n\n", p(40), "::pricing\n\n", STEPSB), rule: "more than one ::pricing", expect: "error" },
  // rule 5
  "r5-good": { md: base(p(40), GL, p(40), TABLE, p(40), STEPSB), rule: "straight after", expect: "none" },
  "r5-stacked": { md: base(p(40), GL, TABLE, p(40), STEPSB), rule: "straight after", expect: "error" },
  "r5-heading-between-still-stacked": { md: base(p(40), GL, h2("Next"), TABLE, p(40), STEPSB), rule: "straight after", expect: "error" },
  "r5-image-then-block": { md: base(p(40), GL, p(40), IMG, TABLE, p(40), STEPSB), rule: "straight after", expect: "error" },
  "r5-end-cta-not-a-block": { md: base(p(40), GL, p(40), TABLE, "::cta{variant=\"end\"}\n"), rule: "straight after", expect: "none" },
  // rule 6
  "r6-good-with-list": { md: base(p(40), GL, h2("Sec"), p(120), list(3), p(60), TABLE, STEPSB), rule: "no list, table or visual block", expect: "none" },
  "r6-long-plain": { md: base(p(40), GL, TABLE, p(30), STEPSB, p(30), h2("Sec"), p(100), p(100)), rule: "no list, table or visual block", expect: "error" },
  "r6-short-plain-ok": { md: base(p(40), GL, TABLE, p(30), STEPSB, p(30), h2("Sec"), p(140)), rule: "no list, table or visual block", expect: "none" },
  "r6-long-with-table": { md: base(p(40), GL, h2("Sec"), p(100), TABLE, p(100), STEPSB), rule: "no list, table or visual block", expect: "none" },
  // rule 7
  "r7-two-ok": { md: base(p(40), GL, h2("A"), list(8), h2("B"), list(8), h2("C"), p(60), TABLE, STEPSB), rule: "list-heavy sections in a row", expect: "none" },
  "r7-three-warns": { md: base(p(40), GL, h2("A"), list(8), h2("B"), list(8), h2("C"), list(8), TABLE, STEPSB), rule: "list-heavy sections in a row", expect: "warn" },
  "r7-prose-breaks-run": { md: base(p(40), GL, h2("A"), list(8), h2("B"), list(8), h2("P"), p(60), h2("C"), list(8), TABLE, STEPSB), rule: "list-heavy sections in a row", expect: "none" },
  // rule 8
  "r8-footnote-wording": { md: base(p(40), GL, h2("Cost"), "::pricing\n\n", "Plans renew each week.\n\n", STEPSB), rule: "repeats the footnote", expect: "error" },
  "r8-cancel-wording": { md: base(p(40), GL, h2("Cost"), p(20), "::pricing\n\n", "You can cancel any time.\n\n", STEPSB), rule: "repeats the footnote", expect: "error" },
  "r8-footnote-off-ok": { md: base(p(40), GL, h2("Cost"), "::pricing{footnote=\"off\"}\n\n", "Plans renew each week.\n\n", STEPSB), rule: "repeats the footnote", expect: "none" },
  "r8-before-wording": { md: base(p(40), GL, h2("Cost"), "Cancel any time.\n\n", "::pricing\n\n", STEPSB), rule: "repeats the footnote", expect: "error" },
  "r8-elsewhere-in-section-ok": {
    md: base(p(40), GL, h2("Cost"), "Cancel the old plan first.\n\n", p(20), "::pricing\n\n", "Every plan works in all styles.\n\n", "Plans renew on their own.\n\n", STEPSB),
    rule: "repeats the footnote",
    expect: "none",
  },
  "r8-clean-neighbour": { md: base(p(40), GL, h2("Cost"), p(20), "::pricing\n\n", "Every plan works in all styles.\n\n", STEPSB), rule: "repeats the footnote", expect: "none" },
};

// One tsx run for every case: parse, count words, run the rules.
const script = `
  const read = await import(${JSON.stringify(path.join(repo, "lib/content/read.ts"))}).then((m) => m.default ?? m);
  const rhythm = await import(${JSON.stringify(path.join(repo, "lib/content/rhythm.ts"))}).then((m) => m.default ?? m);
  const cases = JSON.parse(process.env.CASES);
  const out = {};
  for (const [name, c] of Object.entries(cases)) {
    const tree = read.parseMdast(c.md);
    const words = c.words ?? read.countWords(read.bodyText(tree));
    out[name] = rhythm.rhythmIssues(tree, { type: c.type ?? "guides", words });
  }
  console.log(JSON.stringify(out));
`;
const rhythmRun = spawnSync(process.execPath, [tsx, "--input-type=module", "-e", script], {
  cwd: repo,
  encoding: "utf8",
  env: { ...process.env, CASES: JSON.stringify(Object.fromEntries(Object.entries(rhythmCases).map(([k, v]) => [k, { md: v.md, words: v.words, type: v.type }]))) },
});
assert.equal(rhythmRun.status, 0, rhythmRun.stderr);
const rhythm = JSON.parse(rhythmRun.stdout.trim().split("\n").pop());

for (const [name, c] of Object.entries(rhythmCases)) {
  test(`rhythm ${name}: ${c.expect}`, () => {
    const re = new RegExp(c.rule);
    const hits = rhythm[name].filter((i) => re.test(i.message));
    if (c.expect === "none") assert.deepEqual(hits, [], JSON.stringify(rhythm[name]));
    else {
      assert.ok(hits.length >= 1, `expected a ${c.expect} for /${c.rule}/, got ${JSON.stringify(rhythm[name])}`);
      assert.ok(hits.every((h) => h.level === c.expect), JSON.stringify(hits));
    }
  });
}

test("the unmodified base document passes every rhythm rule", () => {
  const res = spawnSync(
    process.execPath,
    [
      tsx,
      "--input-type=module",
      "-e",
      `const read = await import(${JSON.stringify(path.join(repo, "lib/content/read.ts"))}).then((m) => m.default ?? m);
       const rhythm = await import(${JSON.stringify(path.join(repo, "lib/content/rhythm.ts"))}).then((m) => m.default ?? m);
       const tree = read.parseMdast(process.env.MD);
       console.log(JSON.stringify(rhythm.rhythmIssues(tree, { type: "guides", words: 400 })));`,
    ],
    { cwd: repo, encoding: "utf8", env: { ...process.env, MD: ok } },
  );
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(JSON.parse(res.stdout.trim().split("\n").pop()), []);
});
