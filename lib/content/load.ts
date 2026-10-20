import {
  CONTENT_DIR,
  assertDirectivesValid,
  bodyText,
  countWords,
  findDirectives,
  listArticleFiles,
  parseFrontmatter,
  parseMdast,
  readFrontmatter,
} from "@/lib/content/read";
import { PUBLISHED_TYPES, type ArticleFrontmatter, type ArticleType } from "@/lib/content/schema";

export type Article = ArticleFrontmatter & {
  body: string;
  wordCount: number;
  /** words / 200, rounded up, minimum 1. */
  readMinutes: number;
  /** The body has its own `::cta{variant="end"}`; otherwise the layout adds one. */
  hasEndCta: boolean;
};

// Drafts render in `next dev` but never in a production build.
const INCLUDE_DRAFTS = process.env.NODE_ENV !== "production";

/**
 * Reads, validates and returns every article, newest first. Anything invalid
 * throws, so `next build` fails instead of shipping a broken page: bad
 * frontmatter, a slug that differs from its filename, an unknown directive,
 * or a `related` slug that does not exist.
 */
export function getAllArticles(): Article[] {
  // Production builds read the files once; dev re-reads so edits show up.
  if (memo) return memo;
  const result = readAll();
  if (!INCLUDE_DRAFTS) memo = result;
  return result;
}

let memo: Article[] | null = null;

function readAll(): Article[] {
  const files = listArticleFiles(CONTENT_DIR);
  const all: Article[] = [];
  const seen = new Set<string>();

  for (const f of files) {
    const { data, body } = readFrontmatter(f.file);
    const fm = parseFrontmatter(f, data);
    const tree = parseMdast(body);
    assertDirectivesValid(tree, f.file);
    const wordCount = countWords(bodyText(tree));
    const key = `${fm.type}/${fm.slug}`;
    if (seen.has(key)) throw new Error(`Duplicate article ${key}`);
    seen.add(key);
    all.push({
      ...fm,
      body,
      wordCount,
      readMinutes: Math.max(1, Math.ceil(wordCount / 200)),
      hasEndCta: findDirectives(tree).some((d) => d.name === "cta" && d.attrs.variant === "end"),
    });
  }

  const visible = all.filter((a) => INCLUDE_DRAFTS || !a.draft);
  const slugs = new Set(visible.map((a) => a.slug));
  for (const a of visible) {
    for (const rel of a.related) {
      if (!slugs.has(rel)) {
        throw new Error(`${a.type}/${a.slug}: related slug "${rel}" does not exist`);
      }
    }
  }

  return visible.sort(
    (a, b) =>
      b.datePublished.localeCompare(a.datePublished) || a.slug.localeCompare(b.slug),
  );
}

/** Articles of every type that has public routes. Use this, not
 *  getAllArticles(), wherever articles become URLs. */
export function getPublishedArticles(): Article[] {
  return getAllArticles().filter((a) => PUBLISHED_TYPES.includes(a.type));
}

export function getArticles(type: ArticleType): Article[] {
  return getAllArticles().filter((a) => a.type === type);
}

export function getArticle(type: ArticleType, slug: string): Article | undefined {
  return getAllArticles().find((a) => a.type === type && a.slug === slug);
}

/** Up to three other articles of the same type, newest first. Articles the
 *  author listed in `related` come first. */
export function getRelated(article: Article, limit = 3): Article[] {
  const others = getArticles(article.type).filter((a) => a.slug !== article.slug);
  const listed = article.related
    .map((slug) => others.find((a) => a.slug === slug))
    .filter((a): a is Article => Boolean(a));
  const rest = others.filter((a) => !listed.includes(a));
  return [...listed, ...rest].slice(0, limit);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function articlePath(a: Pick<Article, "type" | "slug">): string {
  return `/${a.type}/${a.slug}`;
}
