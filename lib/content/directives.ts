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

export type DirectiveSpec = {
  required: readonly string[];
  optional: readonly string[];
};

export const DIRECTIVES: Record<string, DirectiveSpec> = {
  "before-after": {
    required: ["before", "after", "beforeAlt", "afterAlt"],
    optional: ["caption"],
  },
  cta: { required: [], optional: ["variant", "title", "text"] },
  "style-card": { required: [], optional: ["ids", "id", "text"] },
};

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
  if (kind !== "leafDirective") {
    return [`"${name}" must be a leaf directive on its own line, like ::${name}{...}`];
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
  return problems;
}
