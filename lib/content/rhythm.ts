import { toString } from "mdast-util-to-string";
import type { Nodes, Root } from "mdast";
import { imageOnlyParagraph } from "./blocks.ts";

// "Visual rhythm" rules from content/_system/STYLE.md, section 8 of the
// article components spec. Pure: mdast in, issues out. Run by
// scripts/lint-articles.mjs. Lines are relative to the body.
//
//   1. no long plain run: warn above 250 words, fail above 350
//   2. the first visual block starts within the first 200 words
//   3. minimum mix: a table or ::pricing, an :::at-a-glance, and for a guide of
//      900+ words a :::steps or :::looks
//   4. callout budget: tip/note 1 per 500 words (minimum 1 allowed) and 3 per
//      article; at most one :::at-a-glance and one ::pricing
//   5. no stacking: two visual blocks need a sentence between them
//   6. an H2 section over 150 words has a list or a visual block
//   7. no more than two list-heavy H2 sections in a row (warning)
//   8. reuse, do not retype: no hand-typed prices, and no renew or cancel
//      wording in the paragraph directly before or after ::pricing (checked in
//      priceMentions and here)
//
// A "visual block" is ::before-after, ::style-card, :::looks, :::steps,
// :::at-a-glance, ::pricing, :::tip, :::note, a table, a body image or a
// mid-article ::cta. The end CTA does not count.

export const RUN_WARN_WORDS = 250;
export const RUN_FAIL_WORDS = 350;
export const FIRST_BLOCK_WORDS = 200;
export const SECTION_LIST_WORDS = 150;
export const WORDS_PER_CALLOUT = 500;
export const MAX_CALLOUTS = 3;
export const LONG_GUIDE_WORDS = 900;

export type RhythmIssue = { level: "error" | "warn"; rule: string; message: string; line?: number };

type Kind =
  | { kind: "text"; words: number; list: boolean }
  | { kind: "heading"; depth: number; text: string }
  | { kind: "block"; name: string }
  | { kind: "skip" };

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

function classify(node: Nodes): Kind {
  switch (node.type) {
    case "heading":
      return { kind: "heading", depth: node.depth, text: toString(node) };
    case "paragraph":
      return imageOnlyParagraph(node) ? { kind: "block", name: "image" } : { kind: "text", words: words(toString(node)), list: false };
    case "list":
      return { kind: "text", words: words(toString(node)), list: true };
    case "blockquote":
      return { kind: "text", words: words(toString(node)), list: false };
    case "table":
      return { kind: "block", name: "table" };
    case "leafDirective":
      if (node.name === "cta" && node.attributes?.variant === "end") return { kind: "skip" };
      return { kind: "block", name: node.name };
    case "containerDirective":
      return { kind: "block", name: node.name };
    default:
      return { kind: "skip" };
  }
}

const FOOTNOTE_WORDING = /\b(renew\w*|cancel\w*)\b/i;

/** Body lines (1-based, relative to the body) that contain a typed price like
 *  `$9.99`. Prices come from `::pricing` only. */
export function priceMentions(text: string): number[] {
  const lines: number[] = [];
  text.split("\n").forEach((l, i) => {
    if (/\$\d/.test(l)) lines.push(i + 1);
  });
  return lines;
}

export function rhythmIssues(tree: Root, opts: { type: string; words: number }): RhythmIssue[] {
  const out: RhythmIssue[] = [];
  const add = (level: RhythmIssue["level"], rule: string, message: string, node?: Nodes) =>
    out.push({ level, rule, message, line: node?.position?.start.line });

  const nodes = tree.children.map((node) => ({ node, c: classify(node) }));

  // Rule 1: longest plain run.
  let run = 0;
  let runNode: Nodes | undefined;
  const flushRun = () => {
    if (run > RUN_WARN_WORDS) {
      add(
        run > RUN_FAIL_WORDS ? "error" : "warn",
        "rhythm",
        `${run} words of text in a row without a visual block (warn above ${RUN_WARN_WORDS}, fail above ${RUN_FAIL_WORDS}); add a table, :::steps, :::tip or an image`,
        runNode,
      );
    }
    run = 0;
    runNode = undefined;
  };
  for (const { node, c } of nodes) {
    if (c.kind === "text") {
      run += c.words;
      if (run > RUN_WARN_WORDS && !runNode) runNode = node;
    } else if (c.kind === "block") {
      flushRun();
    }
  }
  flushRun();

  // Rule 2: the first visual block comes early.
  let before = 0;
  for (const { node, c } of nodes) {
    if (c.kind === "text") before += c.words;
    if (c.kind === "block") {
      if (before > FIRST_BLOCK_WORDS) {
        add("error", "rhythm", `the first visual block starts after ${before} words (${FIRST_BLOCK_WORDS} at most); an :::at-a-glance or a table is best`, node);
      }
      break;
    }
  }

  // Rules 3 and 4: the mix and the budgets.
  const names = nodes.flatMap(({ c }) => (c.kind === "block" ? [c.name] : []));
  const count = (...n: string[]) => names.filter((x) => n.includes(x)).length;
  if (count("table", "pricing") === 0) add("error", "rhythm", "needs at least one table or ::pricing");
  if (count("at-a-glance") === 0) add("error", "rhythm", "needs an :::at-a-glance right after the intro");
  if (opts.type === "guides" && opts.words >= LONG_GUIDE_WORDS && count("steps", "looks") === 0) {
    add("error", "rhythm", `a guide of ${LONG_GUIDE_WORDS} words or more needs a :::steps or :::looks`);
  }
  const second = (name: string) => nodes.filter(({ c }) => c.kind === "block" && c.name === name)[1]?.node;
  if (count("at-a-glance") > 1) add("error", "rhythm", "more than one :::at-a-glance", second("at-a-glance"));
  if (count("pricing") > 1) add("error", "rhythm", "more than one ::pricing", second("pricing"));
  const callouts = count("tip", "note");
  // Deliberate floor of 1 (orchestrator decision, 2026-10-20): a short guide
  // still deserves one tip, so the budget is 1 per 500 words, minimum 1, max 3.
  const allowed = Math.min(MAX_CALLOUTS, Math.max(1, Math.floor(opts.words / WORDS_PER_CALLOUT)));
  if (callouts > allowed) {
    add("error", "rhythm", `${callouts} :::tip or :::note blocks; at most ${allowed} for ${opts.words} words (1 per ${WORDS_PER_CALLOUT}, ${MAX_CALLOUTS} per article)`);
  }

  // Rule 5: no stacking. A heading is not a sentence.
  let prev: string | null = null;
  for (const { node, c } of nodes) {
    if (c.kind === "text") prev = null;
    if (c.kind === "block") {
      if (prev) add("error", "rhythm", `${label(c.name)} comes straight after ${label(prev)}; put a sentence between them`, node);
      prev = c.name;
    }
  }

  // Rules 6, 7 and the pricing wording rule: per H2 section.
  type Section = { title: string; node?: Nodes; words: number; listWords: number; visual: boolean };
  const sections: Section[] = [];
  let cur: Section | null = null;
  for (const { node, c } of nodes) {
    if (c.kind === "heading" && c.depth === 2) {
      cur = { title: c.text, node, words: 0, listWords: 0, visual: false };
      sections.push(cur);
      continue;
    }
    if (!cur) {
      // The intro before the first H2 is not a section, but pricing may live there.
      cur = { title: "", words: 0, listWords: 0, visual: false };
      sections.push(cur);
    }
    if (c.kind === "text") {
      cur.words += c.words;
      if (c.list) {
        cur.listWords += c.words;
        cur.visual = true;
      }
    } else if (c.kind === "block") {
      cur.visual = true;
    }
  }
  let listRun = 0;
  for (const s of sections) {
    if (!s.title) continue;
    if (s.words > SECTION_LIST_WORDS && !s.visual) {
      add("error", "rhythm", `section "${s.title}" has ${s.words} words and no list, table or visual block (${SECTION_LIST_WORDS} at most)`, s.node);
    }
    if (s.words > 0 && s.listWords / s.words > 0.5) {
      listRun++;
      if (listRun > 2) add("warn", "rhythm", `"${s.title}" makes ${listRun} list-heavy sections in a row (2 at most); mix in prose or a visual block`, s.node);
    } else {
      listRun = 0;
    }
  }

  // Rule 8: only the paragraph directly before or after ::pricing is checked
  // (renew or cancel wording elsewhere in the section is fine).
  nodes.forEach(({ node }, i) => {
    if (node.type !== "leafDirective" || node.name !== "pricing" || node.attributes?.footnote === "off") return;
    for (const neighbour of [nodes[i - 1]?.node, nodes[i + 1]?.node]) {
      if (neighbour?.type === "paragraph" && FOOTNOTE_WORDING.test(toString(neighbour))) {
        add("error", "rhythm", "the text next to ::pricing repeats the footnote (renewal and cancel wording); drop it or use footnote=\"off\"", neighbour);
      }
    }
  });

  return out;
}

function label(name: string): string {
  if (name === "image") return "an image";
  if (name === "table") return "a table";
  if (name === "before-after" || name === "style-card" || name === "pricing" || name === "cta") return `::${name}`;
  return `:::${name}`;
}
