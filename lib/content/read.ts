import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import type { Root } from "mdast";
import { styles } from "../../data/styles.ts";
import { checkDirective } from "./directives.ts";
import { ARTICLE_TYPES, articleSchema, type ArticleType } from "./schema.ts";

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
    found.push({
      name: node.name,
      kind: node.type,
      attrs,
      line: node.position?.start.line,
      problems: checkDirective(node.name, node.type, attrs, STYLE_IDS),
    });
  });
  return found;
}

/** Throws a build-failing error describing every problem. */
export function assertDirectivesValid(tree: Root, where: string): void {
  const problems = findDirectives(tree).flatMap((d) =>
    d.problems.map((p) => `${where}${d.line ? `:${d.line}` : ""}: ${p}`),
  );
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
