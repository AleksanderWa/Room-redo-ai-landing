import type { Element, ElementContent, Properties, Root } from "hast";
import { SKIP, visit } from "unist-util-visit";
import { toString as hastToString } from "hast-util-to-string";

// Turns the container directives (already validated by blocks.ts) and markdown
// tables into the exact markup the CSS expects, so the page is plain HTML plus
// three small components for the parts that need next/image:
//   <rr-step-image>, <rr-look-tile> (see lib/content/render.tsx).

const el = (tagName: string, className: string | null, children: ElementContent[] = [], props: Properties = {}): Element => ({
  type: "element",
  tagName,
  properties: { ...(className ? { className: className.split(" ") } : {}), ...props },
  children,
});

const text = (value: string): ElementContent => ({ type: "text", value });
const isEl = (n: ElementContent): n is Element => n.type === "element";
const isBlank = (n: ElementContent) => n.type === "text" && !n.value.trim();
const elements = (n: Element, tag?: string) => n.children.filter((c): c is Element => isEl(c) && (!tag || c.tagName === tag));
const attr = (n: Element, key: string) => {
  const v = n.properties[key];
  return typeof v === "string" ? v : undefined;
};

/** The inline content of a list item, whether the list is tight or loose. */
function inlineOf(li: Element): ElementContent[] {
  const first = li.children.find((c) => !isBlank(c));
  const nodes = first && isEl(first) && first.tagName === "p" ? first.children : li.children.filter((c) => !(isEl(c) && c.tagName === "p"));
  return nodes.slice();
}

function trimStart(nodes: ElementContent[]): ElementContent[] {
  const out = nodes.slice();
  const first = out[0];
  if (first && first.type === "text") {
    const value = first.value.trimStart();
    if (value) out[0] = text(value);
    else out.shift();
  }
  return out;
}

function glance(node: Element): Element {
  const title = attr(node, "title")?.trim() || "At a glance";
  const list = elements(node, "ul")[0];
  const rows = (list ? elements(list, "li") : []).map((li) => {
    const inline = inlineOf(li);
    const first = inline[0];
    const colon = first && first.type === "text" ? first.value.indexOf(":") : -1;
    const label = first && first.type === "text" ? first.value.slice(0, colon).trim() : "";
    const rest = first && first.type === "text" ? [text(first.value.slice(colon + 1)), ...inline.slice(1)] : inline;
    return el("div", "rr-article-glance-row", [el("dt", null, [text(label)]), el("dd", null, trimStart(rest))]);
  });
  return el("section", "rr-article-glance", [el("p", "rr-article-glance-title", [text(title)]), el("dl", null, rows)], { ariaLabel: title });
}

function findImages(node: Element): Element[] {
  const found: Element[] = [];
  visit(node, "element", (n) => {
    if (n.tagName === "img") found.push(n);
  });
  return found;
}

function steps(node: Element): Element {
  const list = elements(node, "ol")[0];
  const items = (list ? elements(list, "li") : []).map((li) => {
    const inline = inlineOf(li).filter((c, i) => i > 0 || !isBlank(c));
    const strongIndex = inline.findIndex((c) => isEl(c) && c.tagName === "strong");
    const strong = strongIndex >= 0 ? (inline[strongIndex] as Element) : undefined;
    const line = trimStart(inline.filter((_, i) => i !== strongIndex));
    const img = findImages(li)[0];
    const children: ElementContent[] = [
      el("div", "rr-article-step-text", [
        el("span", "rr-article-step-title", strong ? strong.children : []),
        el("span", "rr-article-step-line", line),
      ]),
    ];
    if (img) {
      children.push(
        el("rr-step-image", "rr-article-step-img", [], {
          src: attr(img, "src") ?? "",
          alt: attr(img, "alt") ?? "",
          title: attr(img, "title") ?? "",
        }),
      );
    }
    return el("li", "rr-article-step", children);
  });
  return el("ol", "rr-article-steps", items);
}

const LOOKS_DEFAULT_CAPTION = "The same room, redesigned in the Room Redo app.";

function looks(node: Element): Element {
  const imgs = findImages(node);
  const before = attr(node, "before")?.trim();
  const tiles: Element[] = [];
  if (before) tiles.push(el("rr-look-tile", null, [], { kind: "before", src: before, alt: attr(node, "beforeAlt") ?? "", label: "Before" }));
  for (const img of imgs) {
    tiles.push(el("rr-look-tile", null, [], { kind: "look", src: attr(img, "src") ?? "", alt: attr(img, "alt") ?? "", label: attr(img, "title") ?? "" }));
  }
  const caption = attr(node, "caption")?.trim() || LOOKS_DEFAULT_CAPTION;
  return el("figure", `rr-article-looks rr-article-looks--${tiles.length}`, [
    el("div", "rr-article-looks-grid", tiles),
    el("figcaption", null, [text(caption)]),
  ]);
}

function callout(node: Element, variant: "tip" | "note"): Element {
  const title = attr(node, "title")?.trim() || (variant === "tip" ? "Tip" : "Note");
  return el(
    "aside",
    `rr-article-callout rr-article-callout--${variant}`,
    [el("p", "rr-article-callout-title", [text(title)]), el("div", "rr-article-callout-body", node.children.filter((c) => !isBlank(c)))],
    { ariaLabel: title },
  );
}

/** Column count at which a table turns into cards on a phone. */
export const CARD_COLUMNS = 3;
/** Column count at which a table also gets a focusable scroll region. */
export const WIDE_COLUMNS = 5;

/** Labels every cell with its column header (for the mobile card layout) and
 *  sets explicit table roles on 3+ column tables, so Safari and VoiceOver keep
 *  the table semantics when CSS changes the display. */
function table(node: Element): void {
  const headRow = elements(elements(node, "thead")[0] ?? el("thead", null), "tr")[0];
  const headers = headRow ? elements(headRow).map((c) => hastToString(c).trim()) : [];
  const cols = headers.length;
  const roles = cols >= CARD_COLUMNS;
  node.properties.dataCols = cols;
  if (roles) node.properties.role = "table";
  visit(node, "element", (n) => {
    const align = n.properties.align;
    if ((n.tagName === "th" || n.tagName === "td") && typeof align === "string") {
      n.properties.dataAlign = align;
      delete n.properties.align;
    }
    if (n.tagName === "thead" || n.tagName === "tbody") {
      if (roles) n.properties.role = "rowgroup";
    } else if (n.tagName === "tr") {
      if (roles) n.properties.role = "row";
    } else if (n.tagName === "th") {
      n.properties.scope = "col";
      if (roles) n.properties.role = "columnheader";
    }
  });
  for (const tbody of elements(node, "tbody")) {
    for (const tr of elements(tbody, "tr")) {
      elements(tr, "td").forEach((td, i) => {
        td.properties.dataLabel = headers[i] ?? "";
        if (roles) td.properties.role = "cell";
      });
    }
  }
}

export function rehypeArticleBlocks() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "table") {
        table(node);
        return;
      }
      let replacement: Element | undefined;
      switch (node.tagName) {
        case "rr-at-a-glance":
          replacement = glance(node);
          break;
        case "rr-steps":
          replacement = steps(node);
          break;
        case "rr-looks":
          replacement = looks(node);
          break;
        case "rr-tip":
          replacement = callout(node, "tip");
          break;
        case "rr-note":
          replacement = callout(node, "note");
          break;
        default:
          return;
      }
      if (parent && index !== undefined) parent.children[index] = replacement;
      return SKIP;
    });
  };
}
