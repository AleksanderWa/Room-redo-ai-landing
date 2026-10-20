import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import type { Nodes, Root } from "mdast";
import { shownPricingGroups } from "../../data/pricing.ts";
import { styles } from "../../data/styles.ts";
import { containerBodyIssues } from "./blocks.ts";
import { checkDirective, parsePricingGroups } from "./directives.ts";
import { ARTICLE_TYPES, FAQ_MIN, articleSchema, type ArticleType } from "./schema.ts";

// Node-only helpers shared by the Next.js loader (lib/content/load.ts) and
// scripts/lint-articles.mjs, which loads this file through Node's type
// stripping. Relative imports with .ts extensions are deliberate.

/** `CONTENT_DIR` lets a local run point the site at other content (the
 *  linter fixtures); production uses the repo's content/ folder. */
export const CONTENT_DIR = process.env.CONTENT_DIR
  ? path.resolve(process.env.CONTENT_DIR)
  : path.join(process.cwd(), "content");

export const STYLE_IDS: ReadonlySet<string> = new Set(styles.map((s) => s.id));

export type ArticleFile = { type: ArticleType; slug: string; file: string };

/** Every .md under <contentDir>/guides and <contentDir>/ideas. */
export function listArticleFiles(contentDir: string = CONTENT_DIR): ArticleFile[] {
  const out: ArticleFile[] = [];
  for (const type of ARTICLE_TYPES) {
    const dir = path.join(contentDir, type);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.endsWith(".md")) continue;
      out.push({ type, slug: name.slice(0, -3), file: path.join(dir, name) });
    }
  }
  return out;
}

export function readFrontmatter(file: string): { data: Record<string, unknown>; body: string } {
  const parsed = matter(fs.readFileSync(file, "utf8"));
  return { data: parsed.data, body: parsed.content };
}

export function parseMdast(body: string): Root {
  return unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(body) as Root;
}

export type FoundDirective = {
  name: string;
  kind: string;
  attrs: Record<string, string>;
  line: number | undefined;
  problems: string[];
  /** Non-fatal findings (a callout a little long). */
  warnings: string[];
};

/** Every directive in the tree, with the problems checkDirective finds. */
export function findDirectives(tree: Root): FoundDirective[] {
  const found: FoundDirective[] = [];
  visit(tree, (node) => {
    if (
      node.type !== "leafDirective" &&
      node.type !== "textDirective" &&
      node.type !== "containerDirective"
    ) {
      return;
    }
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(node.attributes ?? {})) attrs[k] = v ?? "";
    const problems = checkDirective(node.name, node.type, attrs, STYLE_IDS);
    const warnings: string[] = [];
    if (node.type === "containerDirective") {
      for (const issue of containerBodyIssues(node as never, attrs)) {
        (issue.level === "error" ? problems : warnings).push(issue.message);
      }
    }
    if (node.name === "pricing") {
      const wanted = parsePricingGroups(attrs);
      const shown = shownPricingGroups(wanted);
      if (shown.length === 0) warnings.push("empty ::pricing (no price group to show); the block renders nothing");
    }
    found.push({
      name: node.name,
      kind: node.type,
      attrs,
      line: node.position?.start.line,
      problems,
      warnings,
    });
  });
  return found;
}

/** A `::cta` leaf directive. mdast-util-directive is not a direct dependency,
 *  so this is a narrow local type plus a guard instead of its node types. */
type Cta = Nodes & { name: string; attributes?: Record<string, string | null | undefined> | null };

function isCta(node: Nodes): node is Cta {
  return node.type === "leafDirective" && (node as Partial<Cta>).name === "cta";
}

/** CTA placement rules: at most one plain `::cta`, at most one end CTA, and
 *  the end CTA must be the last block (the layout adds one when absent). */
export function ctaStructureProblems(tree: Root): { line: number | undefined; message: string }[] {
  const out: { line: number | undefined; message: string }[] = [];
  // Walk the whole tree so a CTA nested in a quote or list still counts.
  const ctas: Cta[] = [];
  visit(tree, (node) => {
    if (isCta(node)) ctas.push(node);
  });
  const ends = ctas.filter((n) => n.attributes?.variant === "end");
  const mids = ctas.filter((n) => n.attributes?.variant !== "end");
  if (mids.length > 1) {
    out.push({ line: mids[1].position?.start.line, message: "more than one plain ::cta; use at most one mid-article CTA" });
  }
  if (ends.length > 1) {
    out.push({ line: ends[1].position?.start.line, message: 'more than one ::cta{variant="end"}' });
  }
  if (ends.length > 0 && tree.children[tree.children.length - 1] !== ends[ends.length - 1]) {
    out.push({
      line: ends[ends.length - 1].position?.start.line,
      message: 'the ::cta{variant="end"} must be the last block of the article',
    });
  }
  return out;
}

/** Throws a build-failing error describing every problem. */
export function assertDirectivesValid(tree: Root, where: string): void {
  const problems = [
    ...findDirectives(tree).flatMap((d) =>
      d.problems.map((p) => `${where}${d.line ? `:${d.line}` : ""}: ${p}`),
    ),
    ...ctaStructureProblems(tree).map((p) => `${where}${p.line ? `:${p.line}` : ""}: ${p.message}`),
  ];
  if (problems.length) throw new Error(problems.join("\n"));
}

/** Parses and validates frontmatter, throwing a readable error. Also checks
 *  that `slug` and `type` match where the file lives. */
export function parseFrontmatter(file: ArticleFile, data: Record<string, unknown>) {
  const result = articleSchema.safeParse(data);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`Invalid frontmatter in ${file.file}\n${lines.join("\n")}`);
  }
  const fm = result.data;
  if (fm.slug !== file.slug) {
    throw new Error(`${file.file}: slug "${fm.slug}" must match the filename "${file.slug}"`);
  }
  if (fm.type !== file.type) {
    throw new Error(`${file.file}: type "${fm.type}" must match its folder "${file.type}"`);
  }
  const badStyles = fm.appStyles.filter((id) => !STYLE_IDS.has(id));
  if (badStyles.length) {
    throw new Error(`${file.file}: unknown appStyles ${badStyles.join(", ")}`);
  }
  return fm;
}

/** Plain text of the body (directives contribute none). */
export function bodyText(tree: Root): string {
  return toString(tree);
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const normText = (s: string) => s.replace(/[‘’]/g, "'").trim().toLowerCase();

/** Findings for the frontmatter `faq`: shape of each question and answer, and a
 *  question that repeats an H2 of the same article. */
export function faqIssues(
  faq: { q: string; a: string }[],
  h2s: string[],
): { level: "error" | "warn"; message: string }[] {
  const out: { level: "error" | "warn"; message: string }[] = [];
  if (faq.length > 0 && faq.length < FAQ_MIN) {
    out.push({ level: "warn", message: `faq has ${faq.length} item(s); fewer than ${FAQ_MIN} shows no accordion` });
  }
  const headings = new Set(h2s.map(normText));
  faq.forEach(({ q, a }, i) => {
    const n = i + 1;
    if (!q.endsWith("?")) out.push({ level: "error", message: `faq ${n}: question must end with a question mark` });
    if (/[*_`[\]<>]/.test(q)) out.push({ level: "error", message: `faq ${n}: question is plain text, no markdown` });
    if (headings.has(normText(q))) {
      out.push({ level: "error", message: `faq ${n}: "${q}" repeats an H2; keep it in one place` });
    }
    const tree = parseMdast(a);
    if (tree.children.length > 2 || tree.children.some((c) => c.type !== "paragraph")) {
      out.push({ level: "error", message: `faq ${n}: answer is one or two plain paragraphs (inline markdown only, no lists, headings or directives)` });
    }
    let hasImage = false;
    visit(tree, "image", () => {
      hasImage = true;
    });
    if (hasImage) out.push({ level: "error", message: `faq ${n}: answers cannot contain images` });
  });
  return out;
}
