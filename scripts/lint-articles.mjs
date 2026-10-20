#!/usr/bin/env node
// Deterministic checks for article markdown, so the LLM guard can spend its
// effort on judgement. Run: `npm run lint:articles [files...]`; also runs in
// `prebuild`, so a failure fails the build.
//
//   --content-dir <dir>   content root (default: ./content). Used by the tests.
//
// Errors (exit 1): invalid frontmatter, em dash, banned phrase, primary
// keyword missing, body H1, broken internal link or related slug, missing
// image or alt text, bad directive, word count out of range.
// Warnings: Flesch Reading Ease below 60, paragraph over 4 sentences.
//
// Run through tsx so it can share the TypeScript schema with the site.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import {
  STYLE_IDS,
  bodyText,
  countWords,
  ctaStructureProblems,
  findDirectives,
  listArticleFiles,
  parseMdast,
  readFrontmatter,
} from "../lib/content/read.ts";
import { WORD_RANGE, articleSchema } from "../lib/content/schema.ts";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
let contentDir = path.join(repo, "content");
const fileArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--content-dir") contentDir = path.resolve(args[++i]);
  else fileArgs.push(path.resolve(args[i]));
}

const SITE = "https://www.airoomredo.com";
// Pages that exist besides articles.
const STATIC_PAGES = new Set(["/", "/guides", "/about/aleksander", "/privacy", "/terms", "/feed.xml"]);

function loadBanned() {
  const file = path.join(repo, "content/_system/BANNED.txt");
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l && !l.startsWith("#"));
}

const norm = (s) => s.replace(/[‘’]/g, "'").toLowerCase();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

function sentences(text) {
  return text.split(/(?<=[.!?])["')\]]*\s+/).filter((s) => /\w/.test(s));
}

function fleschReadingEase(text) {
  const words = text.match(/[A-Za-z']+/g) ?? [];
  const sents = sentences(text);
  if (words.length === 0 || sents.length === 0) return 100;
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  return 206.835 - 1.015 * (words.length / sents.length) - 84.6 * (syl / words.length);
}

const allArticles = listArticleFiles(contentDir);
const knownSlugs = new Set(allArticles.map((a) => `${a.type}/${a.slug}`));
const bannedPhrases = loadBanned();

function internalTargetExists(urlPath) {
  const clean = urlPath.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  if (STATIC_PAGES.has(clean)) return true;
  const m = clean.match(/^\/(guides|ideas)\/([^/]+)$/);
  if (m && knownSlugs.has(`${m[1]}/${m[2]}`)) return true;
  return fs.existsSync(path.join(repo, "public", clean));
}

function publicFileExists(src) {
  return fs.existsSync(path.join(repo, "public", src));
}

function lintFile(entry) {
  const issues = [];
  const add = (level, rule, message, line) => issues.push({ level, rule, message, line });

  const raw = fs.readFileSync(entry.file, "utf8");
  const { data, body } = readFrontmatter(entry.file);
  const bodyOffset = (() => {
    const i = raw.indexOf(body);
    return i <= 0 ? 0 : raw.slice(0, i).split("\n").length - 1;
  })();
  const bodyLine = (node) => (node?.position ? node.position.start.line + bodyOffset : undefined);
  const lineOf = (index) => raw.slice(0, index).split("\n").length;

  // Frontmatter schema, plus the file-location checks.
  const parsed = articleSchema.safeParse(data);
  let fm = null;
  if (!parsed.success) {
    for (const i of parsed.error.issues) {
      add("error", "schema", `${i.path.join(".") || "frontmatter"}: ${i.message}`);
    }
  } else {
    fm = parsed.data;
    if (fm.slug !== entry.slug) {
      add("error", "slug", `slug "${fm.slug}" must match the filename "${entry.slug}"`);
    }
    if (fm.type !== entry.type) {
      add("error", "type", `type "${fm.type}" must match its folder "${entry.type}"`);
    }
    for (const id of fm.appStyles) {
      if (!STYLE_IDS.has(id)) add("error", "schema", `appStyles: unknown style id "${id}"`);
    }
    for (const rel of fm.related) {
      if (rel === fm.slug) add("error", "related", "related lists the article itself");
      else if (!knownSlugs.has(`${fm.type}/${rel}`)) {
        add("error", "related", `related slug "${rel}" does not exist`);
      }
    }
    if (!publicFileExists(fm.hero.src)) add("error", "image", `hero image not found: public${fm.hero.src}`);
  }

  // Em dashes, and en dashes used as dashes.
  for (const m of raw.matchAll(/—|\s–\s/g)) {
    add("error", "em-dash", "dash found; use a full stop, comma, colon or brackets", lineOf(m.index));
  }

  // Banned phrases, whole word or phrase, case-insensitive.
  const haystack = norm(raw);
  for (const phrase of bannedPhrases) {
    const re = new RegExp(`(?<![\\w])${escapeRe(phrase)}(?![\\w])`, "g");
    for (const m of haystack.matchAll(re)) {
      add("error", "banned", `banned phrase "${phrase}"`, lineOf(m.index));
    }
  }

  const tree = parseMdast(body);

  // One H1 only: the page title. No `#` in the body.
  visit(tree, "heading", (node) => {
    if (node.depth === 1) add("error", "h1", "body has an H1; the page title is the only H1", bodyLine(node));
  });

  // Directives, and the files they point at.
  for (const d of findDirectives(tree)) {
    for (const p of d.problems) add("error", "directive", p, d.line ? d.line + bodyOffset : undefined);
    if (d.name === "before-after") {
      for (const key of ["before", "after"]) {
        const src = d.attrs[key];
        if (src && !publicFileExists(src)) {
          add("error", "image", `::before-after ${key} image not found: public${src}`, d.line + bodyOffset);
        }
      }
    }
  }

  for (const p of ctaStructureProblems(tree)) {
    add("error", "directive", p.message, p.line ? p.line + bodyOffset : undefined);
  }

  // Markdown images: alt text and file. Links: internal ones resolve.
  visit(tree, (node) => {
    if (node.type === "image") {
      if (!node.alt || !node.alt.trim()) add("error", "alt", `image ${node.url} has no alt text`, bodyLine(node));
      if (node.url.startsWith("/") && !publicFileExists(node.url)) {
        add("error", "image", `image not found: public${node.url}`, bodyLine(node));
      } else if (!node.url.startsWith("/")) {
        add("error", "image", `image ${node.url} must be a local /images/... file`, bodyLine(node));
      }
    }
    if (node.type === "link") {
      const url = node.url;
      const internal = url.startsWith("/")
        ? url
        : url.startsWith(SITE)
          ? url.slice(SITE.length) || "/"
          : null;
      if (internal && !internalTargetExists(internal)) {
        add("error", "link", `internal link does not resolve: ${url}`, bodyLine(node));
      }
    }
  });

  const text = bodyText(tree);
  const words = countWords(text);

  if (fm) {
    // Primary keyword: seoTitle, first 100 words, at least one H2.
    const kw = norm(fm.primaryKeyword);
    if (!norm(fm.seoTitle).includes(kw)) add("error", "keyword", `primary keyword "${fm.primaryKeyword}" is not in seoTitle`);
    const first100 = norm(text.split(/\s+/).slice(0, 100).join(" "));
    if (!first100.includes(kw)) add("error", "keyword", `primary keyword "${fm.primaryKeyword}" is not in the first 100 words`);
    let inH2 = false;
    visit(tree, "heading", (node) => {
      if (node.depth === 2 && norm(toString(node)).includes(kw)) inH2 = true;
    });
    if (!inH2) add("error", "keyword", `primary keyword "${fm.primaryKeyword}" is not in any H2`);

    const range = WORD_RANGE[fm.type];
    if (words < range.min || words > range.max) {
      add("error", "words", `${words} words; ${fm.type} must be ${range.min} to ${range.max}`);
    }
  }

  // Warnings: readability and paragraph length.
  const prose = [];
  visit(tree, "paragraph", (node) => {
    const t = toString(node);
    prose.push(t);
    if (sentences(t).length > 4) {
      add("warn", "paragraph", `paragraph has ${sentences(t).length} sentences (4 at most)`, bodyLine(node));
    }
  });
  const flesch = fleschReadingEase(prose.join(" "));
  if (flesch < 60) add("warn", "flesch", `Flesch Reading Ease ${flesch.toFixed(0)} (aim for 60 or more)`);

  return issues;
}

const targets = fileArgs.length
  ? fileArgs.map((file) => {
      const type = path.basename(path.dirname(file));
      return { type, slug: path.basename(file, ".md"), file };
    })
  : allArticles;

let errors = 0;
let warnings = 0;
for (const entry of targets) {
  let issues;
  try {
    issues = lintFile(entry);
  } catch (err) {
    issues = [{ level: "error", rule: "parse", message: err instanceof Error ? err.message : String(err) }];
  }
  if (issues.length) {
    console.log(path.relative(process.cwd(), entry.file));
    for (const i of issues) {
      console.log(`  ${i.level === "error" ? "error" : "warn "} [${i.rule}]${i.line ? ` line ${i.line}` : ""}: ${i.message}`);
    }
  }
  errors += issues.filter((i) => i.level === "error").length;
  warnings += issues.filter((i) => i.level === "warn").length;
}

const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
console.log(`lint-articles: ${plural(targets.length, "file")}, ${plural(errors, "error")}, ${plural(warnings, "warning")}`);
process.exit(errors > 0 ? 1 : 0);
