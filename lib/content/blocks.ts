import { toString } from "mdast-util-to-string";
import type { Image, List, ListItem, Nodes, Paragraph, PhrasingContent, Table } from "mdast";

// Checks the markdown INSIDE the container directives (the attributes are
// checked by directives.ts). Pure: mdast in, issues out. Shared by the build
// (read.ts, throws on errors) and scripts/lint-articles.mjs (prints warnings
// too). Relative imports with .ts extensions are deliberate (Node type stripping).

export type BlockIssue = { level: "error" | "warn"; message: string };

export const GLANCE_MIN = 3;
export const GLANCE_MAX = 5;
export const GLANCE_LABEL_MAX = 14;
export const GLANCE_VALUE_MAX = 34;
export const STEPS_MIN = 2;
export const STEPS_MAX = 5;
export const STEP_TITLE_MAX = 40;
export const STEP_LINE_MAX = 120;
export const LOOK_NAME_MAX = 24;
export const LOOKS_MAX = 4;
export const LOOKS_MAX_WITH_BEFORE = 3;
export const CALLOUT_WARN_WORDS = 45;
export const CALLOUT_FAIL_WORDS = 70;
export const CALLOUT_LIST_MAX = 3;

type Container = Nodes & { name: string; children: Nodes[] };

const err = (message: string): BlockIssue => ({ level: "error", message });
const warn = (message: string): BlockIssue => ({ level: "warn", message });

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

function isBlank(node: Nodes): boolean {
  return node.type === "text" && !node.value.trim();
}

/** A paragraph that holds only images (and whitespace between them). */
export function imageOnlyParagraph(node: Nodes | undefined): node is Paragraph {
  if (!node || node.type !== "paragraph") return false;
  const kids = node.children.filter((c) => !isBlank(c));
  return kids.length > 0 && kids.every((c) => c.type === "image");
}

/** Splits `Label: value` at the first colon of a paragraph's first text node. */
export function splitLabelValue(p: Paragraph): { label: string; value: string } | null {
  const first = p.children[0];
  if (!first || first.type !== "text") return null;
  const i = first.value.indexOf(":");
  if (i === -1) return null;
  const rest: PhrasingContent[] = [{ type: "text", value: first.value.slice(i + 1) }, ...p.children.slice(1)];
  return { label: first.value.slice(0, i).trim(), value: toString({ type: "paragraph", children: rest }).trim() };
}

function singleList(node: Container, ordered: boolean, name: string): List | null | BlockIssue {
  if (node.children.length !== 1 || node.children[0].type !== "list") {
    return err(`:::${name} must contain just ${ordered ? "a numbered" : "a bullet"} list`);
  }
  const list = node.children[0];
  if (Boolean(list.ordered) !== ordered) {
    return err(`:::${name} must contain ${ordered ? "a numbered (1. 2. 3.)" : "a bullet (- )"} list`);
  }
  return list;
}

function glanceIssues(node: Container): BlockIssue[] {
  const list = singleList(node, false, "at-a-glance");
  if (!list || "level" in list) return list ? [list] : [];
  const out: BlockIssue[] = [];
  if (list.children.length < GLANCE_MIN || list.children.length > GLANCE_MAX) {
    out.push(err(`:::at-a-glance needs ${GLANCE_MIN} to ${GLANCE_MAX} items, found ${list.children.length}`));
  }
  list.children.forEach((item: ListItem, i: number) => {
    const n = i + 1;
    const p = item.children.length === 1 ? item.children[0] : undefined;
    const lv = p && p.type === "paragraph" ? splitLabelValue(p) : null;
    if (!lv) {
      out.push(err(`:::at-a-glance item ${n} must be "Label: value"`));
      return;
    }
    if (!lv.label || !lv.value) {
      out.push(err(`:::at-a-glance item ${n} needs both a label and a value`));
      return;
    }
    if (lv.label.length > GLANCE_LABEL_MAX) {
      out.push(err(`:::at-a-glance item ${n} label "${lv.label}" is over ${GLANCE_LABEL_MAX} characters`));
    }
    if (lv.value.length > GLANCE_VALUE_MAX) {
      out.push(err(`:::at-a-glance item ${n} value is over ${GLANCE_VALUE_MAX} characters`));
    }
  });
  return out;
}

function stepsIssues(node: Container): BlockIssue[] {
  const list = singleList(node, true, "steps");
  if (!list || "level" in list) return list ? [list] : [];
  const out: BlockIssue[] = [];
  if (list.children.length < STEPS_MIN || list.children.length > STEPS_MAX) {
    out.push(err(`:::steps needs ${STEPS_MIN} to ${STEPS_MAX} items, found ${list.children.length}`));
  }
  list.children.forEach((item: ListItem, i: number) => {
    const n = i + 1;
    const [p, ...rest] = item.children;
    const strong = p && p.type === "paragraph" ? p.children[0] : undefined;
    if (!p || p.type !== "paragraph" || !strong || strong.type !== "strong") {
      out.push(err(`:::steps item ${n} must start with a bold title: **Title.** One line.`));
      return;
    }
    const title = toString(strong).trim();
    const line = toString({ type: "paragraph", children: p.children.slice(1) }).trim();
    if (title.length > STEP_TITLE_MAX) out.push(err(`:::steps item ${n} title is over ${STEP_TITLE_MAX} characters`));
    if (!line) out.push(err(`:::steps item ${n} needs a one-line description after the bold title`));
    if (line.length > STEP_LINE_MAX) out.push(err(`:::steps item ${n} line is over ${STEP_LINE_MAX} characters`));
    const extra = rest.filter((c) => !imageOnlyParagraph(c));
    const images = rest.filter((c) => imageOnlyParagraph(c));
    if (extra.length > 0) out.push(err(`:::steps item ${n} may only add one image (no second paragraph or nested list)`));
    if (images.length > 1 || (images[0] && (images[0] as Paragraph).children.filter((c) => c.type === "image").length > 1)) {
      out.push(err(`:::steps item ${n} has more than one image`));
    }
  });
  return out;
}

/** Every image in a `:::looks` container, in order. */
export function looksImages(node: Container): Image[] {
  return node.children.flatMap((c) => (c.type === "paragraph" ? c.children.filter((k): k is Image => k.type === "image") : []));
}

function looksIssues(node: Container, attrs: Record<string, string>): BlockIssue[] {
  const out: BlockIssue[] = [];
  const stray = node.children.filter((c) => !imageOnlyParagraph(c));
  if (stray.length > 0) out.push(err(":::looks may contain images only, one per look"));
  const images = looksImages(node);
  const withBefore = Boolean(attrs.before?.trim());
  const max = withBefore ? LOOKS_MAX_WITH_BEFORE : LOOKS_MAX;
  if (images.length < 2 || images.length > max) {
    out.push(err(`:::looks needs 2 to ${max} looks${withBefore ? " when it has a before image" : ""}, found ${images.length}`));
  }
  images.forEach((img, i) => {
    const title = img.title?.trim() ?? "";
    if (!title) {
      out.push(err(`:::looks image ${i + 1} needs a title with the style name: ![alt](src "Style name")`));
    } else if (title.toLowerCase() === "photo") {
      out.push(err(`:::looks image ${i + 1}: every look is an AI redesign, "photo" is not allowed here`));
    } else if (title.length > LOOK_NAME_MAX) {
      out.push(err(`:::looks image ${i + 1} style name is over ${LOOK_NAME_MAX} characters`));
    }
  });
  return out;
}

function calloutIssues(node: Container): BlockIssue[] {
  const name = node.name;
  const kids = node.children;
  if (kids.length === 0) return [err(`:::${name} is empty`)];
  const out: BlockIssue[] = [];
  const bad = kids.filter((c) => c.type !== "paragraph" && c.type !== "list");
  if (bad.length > 0) {
    out.push(err(`:::${name} may hold one short paragraph or a short list only (found ${bad[0].type})`));
    return out;
  }
  const hasImage = (c: Nodes) =>
    c.type === "paragraph" && c.children.some((k) => k.type === "image");
  if (kids.some(hasImage)) out.push(err(`:::${name} may not contain images`));
  const paragraphs = kids.filter((c) => c.type === "paragraph");
  const lists = kids.filter((c): c is List => c.type === "list");
  if (paragraphs.length + lists.length > 1) {
    out.push(err(`:::${name} may hold one paragraph or one list, not several blocks`));
  }
  for (const l of lists) {
    if (l.children.length > CALLOUT_LIST_MAX) {
      out.push(err(`:::${name} list has ${l.children.length} items (${CALLOUT_LIST_MAX} at most)`));
    }
  }
  const w = wordCount(toString(node));
  if (w > CALLOUT_FAIL_WORDS) out.push(err(`:::${name} is ${w} words; over ${CALLOUT_FAIL_WORDS} should be a paragraph in the body`));
  else if (w > CALLOUT_WARN_WORDS) out.push(warn(`:::${name} is ${w} words (${CALLOUT_WARN_WORDS} at most)`));
  return out;
}

/** Issues with the markdown inside one container directive. Unknown names and
 *  leaf directives return nothing (directives.ts already rejects those). */
export function containerBodyIssues(node: Container, attrs: Record<string, string>): BlockIssue[] {
  switch (node.name) {
    case "at-a-glance":
      return glanceIssues(node);
    case "steps":
      return stepsIssues(node);
    case "looks":
      return looksIssues(node, attrs);
    case "tip":
    case "note":
      return calloutIssues(node);
    default:
      return [];
  }
}

export const TABLE_WARN_COLUMNS = 5;

/** Every `td` needs a header to use as its label in the mobile card layout,
 *  and a table wider than five columns should be split. */
export function tableIssues(table: Table): BlockIssue[] {
  const out: BlockIssue[] = [];
  const header = table.children[0];
  const cols = header?.children.length ?? 0;
  header?.children.forEach((cell, i) => {
    if (!toString(cell).trim()) out.push(err(`table column ${i + 1} has no header (every column needs one)`));
  });
  if (cols > TABLE_WARN_COLUMNS) out.push(warn(`table has ${cols} columns (${TABLE_WARN_COLUMNS} at most; split it)`));
  return out;
}
