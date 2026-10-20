// The only directives an article may use. Anything else fails the build.
// Pure module: shared by the renderer (lib/content/render.tsx) and the linter
// (scripts/lint-articles.mjs, via Node type stripping).
//
//   ::before-after{before="/images/articles/x/a.webp" after="/images/articles/x/b.webp"
//                  beforeAlt="..." afterAlt="..." caption="optional"}
//   ::cta                              mid-article block
//   ::cta{variant="end" title="..." text="..."}
//   ::style-card{ids="japandi"}        1 to 4 ids (space or comma separated); "id" works for one
//   ::style-card{ids="japandi scandinavian" text="japandi: calm | scandinavian: light"}
//   ::pricing                          shared prices from data/pricing.ts (the only way to show a price)
//   ::pricing{groups="plans packs" footnote="off"}
//   :::at-a-glance{title="..."}        container: 3 to 5 `- Label: value` bullets
//   :::steps                           container: an ordered list of `**Title.** One line.` items
//   :::looks{before="..." beforeAlt="..." caption="..."}   container: one image per look, title = style name
//   :::style-slider{before="..." beforeAlt="..." caption="..."}   container: a before/after slider with a style chip
//                                      per look (2 to 4 images, title = chip label); before and beforeAlt required
//   :::tip{title="..."} / :::note{title="..."}             container: a short callout
//
// Leaf directives are `::name{...}` on their own line; container directives wrap
// markdown between `:::name` and `:::`. Their contents are checked in blocks.ts.

export type DirectiveSpec = {
  kind: "leaf" | "container";
  required: readonly string[];
  optional: readonly string[];
};

export const DIRECTIVES: Record<string, DirectiveSpec> = {
  "before-after": {
    kind: "leaf",
    required: ["before", "after", "beforeAlt", "afterAlt"],
    optional: ["caption"],
  },
  cta: { kind: "leaf", required: [], optional: ["variant", "title", "text"] },
  "style-card": { kind: "leaf", required: [], optional: ["ids", "id", "text"] },
  pricing: { kind: "leaf", required: [], optional: ["groups", "footnote"] },
  "at-a-glance": { kind: "container", required: [], optional: ["title"] },
  steps: { kind: "container", required: [], optional: [] },
  looks: { kind: "container", required: [], optional: ["before", "beforeAlt", "caption"] },
  "style-slider": { kind: "container", required: ["before", "beforeAlt"], optional: ["caption"] },
  tip: { kind: "container", required: [], optional: ["title"] },
  note: { kind: "container", required: [], optional: ["title"] },
};

/** The mdast node type each kind parses to. */
export const NODE_TYPE = { leaf: "leafDirective", container: "containerDirective" } as const;

export const PRICING_GROUP_IDS = ["free", "plans", "packs"] as const;
export const CALLOUT_TITLE_MAX = 24;

export const CTA_VARIANTS = ["mid", "end"] as const;
export type CtaVariant = (typeof CTA_VARIANTS)[number];

export function parseStyleIds(attrs: Record<string, string>): string[] {
  return (attrs.ids ?? attrs.id ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** `text` for a style card: a plain sentence for a single card, or
 *  `id: sentence | id: sentence` for a row. */
export function parseStyleTexts(attrs: Record<string, string>, ids: string[]): Record<string, string> {
  const raw = attrs.text?.trim();
  if (!raw) return {};
  if (ids.length === 1 && !raw.startsWith(`${ids[0]}:`)) return { [ids[0]]: raw };
  const out: Record<string, string> = {};
  for (const part of raw.split("|")) {
    const i = part.indexOf(":");
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/** `groups` for `::pricing`: space or comma separated; empty means all. */
export function parsePricingGroups(attrs: Record<string, string>): string[] {
  return (attrs.groups ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Problems with one directive's name and attributes (empty when valid).
 *  `knownStyleIds` is passed in so this module stays import-free. */
export function checkDirective(
  name: string,
  kind: string,
  attrs: Record<string, string>,
  knownStyleIds: ReadonlySet<string>,
): string[] {
  const spec = DIRECTIVES[name];
  if (!spec) {
    return [`unknown directive "${name}" (allowed: ${Object.keys(DIRECTIVES).join(", ")})`];
  }
  if (kind !== NODE_TYPE[spec.kind]) {
    return [
      spec.kind === "leaf"
        ? `"${name}" must be a leaf directive on its own line, like ::${name}{...}`
        : `"${name}" must be a container directive, like :::${name} ... :::`,
    ];
  }
  const problems: string[] = [];
  for (const key of Object.keys(attrs)) {
    if (!spec.required.includes(key) && !spec.optional.includes(key)) {
      problems.push(`::${name} does not take "${key}"`);
    }
  }
  for (const key of spec.required) {
    if (!attrs[key]?.trim()) problems.push(`::${name} needs "${key}"`);
  }
  if (name === "cta" && attrs.variant && !(CTA_VARIANTS as readonly string[]).includes(attrs.variant)) {
    problems.push(`::cta variant must be mid or end`);
  }
  if (name === "style-card") {
    const ids = parseStyleIds(attrs);
    if (ids.length < 1 || ids.length > 4) problems.push("::style-card needs 1 to 4 ids");
    for (const id of ids) {
      if (!knownStyleIds.has(id)) problems.push(`::style-card unknown style id "${id}"`);
    }
  }
  if (name === "pricing") {
    for (const g of parsePricingGroups(attrs)) {
      if (!(PRICING_GROUP_IDS as readonly string[]).includes(g)) {
        problems.push(`::pricing unknown group "${g}" (allowed: ${PRICING_GROUP_IDS.join(", ")})`);
      }
    }
    if (attrs.footnote !== undefined && attrs.footnote !== "off") {
      problems.push('::pricing footnote can only be "off"');
    }
  }
  if (name === "looks" && Boolean(attrs.before?.trim()) !== Boolean(attrs.beforeAlt?.trim())) {
    problems.push(":::looks needs both before and beforeAlt, or neither");
  }
  if ((name === "tip" || name === "note") && attrs.title && attrs.title.trim().length > CALLOUT_TITLE_MAX) {
    problems.push(`:::${name} title is over ${CALLOUT_TITLE_MAX} characters`);
  }
  return problems;
}
