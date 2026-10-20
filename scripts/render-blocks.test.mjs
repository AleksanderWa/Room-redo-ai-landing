// Render tests: runs the real article pipeline (renderArticleBody and
// renderInlineMarkdown) on small fixtures and asserts the HTML. Run: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..");
const tsx = path.join(repo, "node_modules/tsx/dist/cli.mjs");

const STEP_IMG = '![AI redesign of a bedroom](/images/hero-after.jpg)';
const cases = {
  table3: "| A | B | C |\n|---|---|---|\n| one | two | three |\n",
  table2: "| A | B |\n|---|---|\n| one | two |\n",
  table5: "| A | B | C | D | E |\n|---|---|---|---|---|\n| 1 | 2 | 3 | 4 | 5 |\n",
  stepsBlank: `:::steps\n1. **One.** First line.\n\n   ${STEP_IMG}\n2. **Two.** Second line.\n:::\n`,
  looks:
    ':::looks{before="/images/hero-before.jpg" beforeAlt="A bedroom before"}\n' +
    '![AI redesign in Japandi style](/images/styles/japandi.jpg "Japandi")\n' +
    '![AI redesign in Bohemian style](/images/styles/bohemian.jpg "Bohemian")\n:::\n',
  styleSlider:
    ':::style-slider{before="/images/hero-before.jpg" beforeAlt="A bedroom before" caption="One bedroom, two styles."}\n' +
    '![AI redesign in Japandi style](/images/styles/japandi.jpg "Japandi")\n' +
    '![AI redesign in Bohemian style](/images/styles/bohemian.jpg "Bohemian")\n:::\n',
  styleSliderOneImage:
    ':::style-slider{before="/images/hero-before.jpg" beforeAlt="A bedroom before"}\n' +
    '![AI redesign in Japandi style](/images/styles/japandi.jpg "Japandi")\n:::\n',
  styleSliderNoTitle:
    ':::style-slider{before="/images/hero-before.jpg" beforeAlt="A bedroom before"}\n' +
    '![AI redesign in Japandi style](/images/styles/japandi.jpg)\n' +
    '![AI redesign in Bohemian style](/images/styles/bohemian.jpg "Bohemian")\n:::\n',
  styleSliderNoBefore:
    ':::style-slider{beforeAlt="A bedroom before"}\n' +
    '![AI redesign in Japandi style](/images/styles/japandi.jpg "Japandi")\n' +
    '![AI redesign in Bohemian style](/images/styles/bohemian.jpg "Bohemian")\n:::\n',
};
// Not valid (the build rejects it), but the transform must still never keep the image in the line.
const stepsNoBlank = `:::steps\n1. **One.** First line.\n   ${STEP_IMG}\n2. **Two.** Second line.\n:::\n`;
const faq = [
  'Safe <script>alert(1)</script> text with <b onclick="x()">raw html</b> and [bad](javascript:alert(1)) and [data](data:text/html;base64,AAAA) and [vb](vbscript:x) and **bold** and [ok](/privacy) and [ext](https://example.com).',
];

const script = `
  import { renderToStaticMarkup } from "react-dom/server";
  const { renderArticleBody, renderInlineMarkdown } = await import(${JSON.stringify(path.join(repo, "lib/content/render.tsx"))}).then((m) => m.default ?? m);
  const cases = JSON.parse(process.env.CASES);
  const out = {};
  for (const [k, md] of Object.entries(cases)) {
    // An invalid block throws (that fails the build); keep the message to assert on.
    try {
      out[k] = renderToStaticMarkup(renderArticleBody(md, k, { slug: "x", type: "guides", campaign: "t" }));
    } catch (e) {
      out[k] = "ERROR: " + e.message;
    }
  }
  // The renderer alone, without the directive validator.
  const { unified } = await import("unified");
  const { default: remarkParse } = await import("remark-parse");
  const { default: remarkGfm } = await import("remark-gfm");
  const { default: remarkDirective } = await import("remark-directive");
  const { default: remarkRehype } = await import("remark-rehype");
  const { visit } = await import("unist-util-visit");
  const { rehypeArticleBlocks } = await import(${JSON.stringify(path.join(repo, "lib/content/rehype-blocks.ts"))}).then((m) => m.default ?? m);
  const named = () => (tree) => visit(tree, (n) => { if (n.type === "containerDirective" || n.type === "leafDirective") n.data = { hName: "rr-" + n.name, hProperties: n.attributes ?? {} }; });
  const p = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).use(named).use(remarkRehype).use(rehypeArticleBlocks);
  const hast = p.runSync(p.parse(process.env.NOBLANK));
  let imgInLine = 0, stepImages = 0;
  visit(hast, "element", (n) => {
    if ((n.properties.className ?? []).includes("rr-article-step-line")) visit(n, "element", (m) => { if (m.tagName === "img") imgInLine++; });
    if (n.tagName === "rr-step-image") stepImages++;
  });
  out.noBlank = { imgInLine, stepImages };
  out.faq = renderToStaticMarkup(renderInlineMarkdown(process.env.FAQ));
  console.log(JSON.stringify(out));
`;
const run = spawnSync(process.execPath, [tsx, "--input-type=module", "-e", script], {
  cwd: repo,
  encoding: "utf8",
  env: { ...process.env, CASES: JSON.stringify(cases), FAQ: faq[0], NOBLANK: stepsNoBlank },
});
assert.equal(run.status, 0, run.stderr);
const html = JSON.parse(run.stdout.trim().split("\n").pop());
const count = (s, re) => (s.match(re) ?? []).length;

test("3+ column tables get table roles and data-label on every cell", () => {
  const h = html.table3;
  assert.match(h, /<table role="table"/);
  assert.equal(count(h, /role="rowgroup"/g), 2);
  assert.equal(count(h, /role="row"/g), 2);
  assert.equal(count(h, /role="columnheader"/g), 3);
  assert.equal(count(h, /role="cell"/g), 3);
  assert.match(h, /data-label="A"/);
  assert.match(h, /data-label="C"/);
  assert.match(h, /rr-article-table--cards/);
  assert.doesNotMatch(h, /role="region"/);
});

test("2 column tables have no explicit roles and no card class, but keep data-label", () => {
  const h = html.table2;
  assert.doesNotMatch(h, /role=/);
  assert.doesNotMatch(h, /rr-article-table--cards/);
  assert.match(h, /data-label="B"/);
});

test("5+ column tables get a focusable scroll region", () => {
  assert.match(html.table5, /role="region"[^>]*tabindex="0"|tabindex="0"[^>]*role="region"/);
});

test("steps: title, line and one image per step, never twice", () => {
  const h = html.stepsBlank;
  assert.equal(count(h, /rr-article-step-title/g), 2);
  assert.match(h, /rr-article-step-title">One\./);
  assert.match(h, /rr-article-step-line">First line\./);
  assert.equal(count(h, /<img /g), 1, "one img");
});

test("steps: an image glued to the item text is never kept in the line", () => {
  assert.deepEqual(html.noBlank, { imgInLine: 0, stepImages: 1 });
});

test("looks: an AI pill on each look, none on the Before tile", () => {
  const h = html.looks;
  assert.equal(count(h, /rr-article-look rr-article-look--look/g), 2);
  assert.equal(count(h, /rr-article-look rr-article-look--before/g), 1);
  assert.equal(count(h, /AI redesign<\/span>/g), 2);
  const beforeTile = h.split("rr-article-look--before")[1].split("rr-article-look-name")[0];
  assert.doesNotMatch(beforeTile, /rr-article-pill/);
  assert.match(h, /rr-article-look-name">Before</);
});

test("style-slider: stacked looks, one chip each, only the first look exposed, one AI pill", () => {
  const h = html.styleSlider;
  assert.match(h, /role="radiogroup"[^>]*aria-label="Pick a style"|aria-label="Pick a style"[^>]*role="radiogroup"/);
  assert.equal(count(h, /role="radio"/g), 2);
  assert.match(h, /aria-checked="true"[^>]*>Japandi</);
  assert.match(h, /aria-checked="false"[^>]*>Bohemian</);
  assert.equal(count(h, /tabindex="0"[^>]*role="radio"|role="radio"[^>]*tabindex="0"/g), 1);
  assert.equal(count(h, /tabindex="-1"/g), 1);
  assert.equal(count(h, /class="rr-ba-after[ "]/g), 2);
  assert.equal(count(h, /rr-ba-after rr-ba-after--active/g), 1);
  assert.equal(count(h, /<div class="rr-ba-after" aria-hidden="true"/g), 1);
  assert.equal(count(h, /AI redesign<\/span>/g), 1);
  assert.match(h, /aria-label="Before and after: Japandi"/);
  assert.match(h, /One bedroom, two styles\. Redesigned in the Room Redo app\./);
});

test("style-slider: too few images, a missing title and a missing before fail the build", () => {
  assert.match(html.styleSliderOneImage, /^ERROR: .*needs 2 to 4 images, found 1/);
  assert.match(html.styleSliderNoTitle, /^ERROR: .*image 1 needs a title/);
  assert.match(html.styleSliderNoBefore, /^ERROR: .*needs "before"/);
});

test("FAQ answers: raw HTML is dropped, unsafe link protocols are neutralized", () => {
  const h = html.faq;
  assert.doesNotMatch(h, /<script/i);
  assert.doesNotMatch(h, /<b[ >]/);
  assert.doesNotMatch(h, /onclick/i);
  assert.doesNotMatch(h, /javascript:/i);
  assert.doesNotMatch(h, /vbscript:/i);
  assert.doesNotMatch(h, /data:text/i);
  assert.match(h, /<strong>bold<\/strong>/);
  assert.match(h, /href="\/privacy"/);
  assert.match(h, /href="https:\/\/example\.com"/);
});
