#!/usr/bin/env node
// Deterministic checks for article markdown, so the LLM guard can spend its
// effort on judgement. Run: `npm run lint:articles [files...]`; also runs in
// `prebuild`, so a failure fails the build.
//
//   --content-dir <dir>   content root (default: ./content). Used by the tests.
//   --faq-file <file>     FAQ module to check (default: ./data/faq.ts). Used by the tests.
//   --link-graph          also check the internal link graph (full runs only; on in prebuild).
//
// Full runs (no file args) also check that every internal FAQ `more.href`
// resolves to a published article.
//
// Link graph (--link-graph): contextual links are article body links, the
// `related` frontmatter and the homepage FAQ `more.href`. Hubs, the homepage
// strip and "Keep reading" don't count, nor do self-links. Per published
// article: 0 inbound is an error, fewer than 2 inbound is a warning, and
// fewer than 2 outbound links to other articles is a warning once 3 or more
// articles are published. Matches content/_system/STYLE.md.
//
// Errors (exit 1): invalid frontmatter, em dash, banned phrase, primary
// keyword missing, body H1, broken internal link or related slug, missing
// image or alt text, bad directive, word count out of range, typed price,
// bad faq, rhythm rules 1 to 6 and 8 (rule 1 only above 350 words).
// Visual blocks: the container directives' contents, tables, the FAQ, typed
// prices (prices come from ::pricing only) and the rhythm rules from STYLE.md.
// Warnings: Flesch Reading Ease below 60, paragraph over 4 sentences, a run
// of 250 to 350 words without a visual block, rhythm rule 7, a long callout,
// a table over 5 columns, a faq under 3 items.
//
// Run through tsx so it can share the TypeScript schema with the site.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import {
  STYLE_IDS,
  bodyText,
  countWords,
  ctaStructureProblems,
  faqIssues,
  findDirectives,
  listArticleFiles,
  parseMdast,
  readFrontmatter,
} from "../lib/content/read.ts";
import { tableIssues } from "../lib/content/blocks.ts";
import { priceMentions, rhythmIssues } from "../lib/content/rhythm.ts";
import { PUBLISHED_TYPES, WORD_RANGE, articleSchema } from "../lib/content/schema.ts";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
let contentDir = path.join(repo, "content");
let faqFile = path.join(repo, "data/faq.ts");
let linkGraph = false;
const fileArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--content-dir") contentDir = path.resolve(args[++i]);
  else if (args[i] === "--faq-file") faqFile = path.resolve(args[++i]);
  else if (args[i] === "--link-graph") linkGraph = true;
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
// Only published articles are valid link and `related` targets: a draft is
// not built in production, so a link to it would 404.
const knownSlugs = new Set(
  allArticles
    .filter((a) => PUBLISHED_TYPES.includes(a.type) && readFrontmatter(a.file).data.draft !== true)
    .map((a) => `${a.type}/${a.slug}`),
);
const bannedPhrases = loadBanned();

function internalTargetExists(urlPath) {
  const clean = urlPath.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  if (STATIC_PAGES.has(clean)) return true;
  // A hub exists only once its type has a published article.
  if (clean === "/ideas") return [...knownSlugs].some((k) => k.startsWith("ideas/"));
  const m = clean.match(/^\/(guides|ideas)\/([^/]+)$/);
  if (m) return PUBLISHED_TYPES.includes(m[1]) && knownSlugs.has(`${m[1]}/${m[2]}`);
  return fs.existsSync(path.join(repo, "public", clean));
}

// A link URL as a site path, or null for an external link.
function toInternal(url) {
  return url.startsWith("/") ? url : url.startsWith(SITE) ? url.slice(SITE.length) || "/" : null;
}

// "/guides/foo#x" -> "guides/foo" when it is a published article, else null.
function articleKey(urlPath) {
  const m = urlPath.split("#")[0].split("?")[0].replace(/\/$/, "").match(/^\/(guides|ideas)\/([^/]+)$/);
  return m && knownSlugs.has(`${m[1]}/${m[2]}`) ? `${m[1]}/${m[2]}` : null;
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
        add("error", "related", `related slug "${rel}" does not exist or is not published`);
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
    for (const w of d.warnings) add("warn", "directive", w, d.line ? d.line + bodyOffset : undefined);
    if (d.name === "before-after" || d.name === "style-slider" || (d.name === "looks" && d.attrs.before)) {
      for (const key of d.name === "before-after" ? ["before", "after"] : ["before"]) {
        const src = d.attrs[key];
        if (src && !publicFileExists(src)) {
          add("error", "image", `::${d.name} ${key} image not found: public${src}`, d.line + bodyOffset);
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
      const internal = toInternal(url);
      if (internal && !internalTargetExists(internal)) {
        add("error", "link", `internal link does not resolve: ${url}`, bodyLine(node));
      }
    }
  });

  const text = bodyText(tree);
  const words = countWords(text);

  visit(tree, "table", (node) => {
    for (const i of tableIssues(node)) add(i.level, "table", i.message, bodyLine(node));
  });
  for (const line of priceMentions(body)) {
    add("error", "price", "typed price in the body; prices come only from ::pricing", line + bodyOffset);
  }
  for (const i of rhythmIssues(tree, { type: entry.type, words })) {
    add(i.level, i.rule, i.message, i.line ? i.line + bodyOffset : undefined);
  }

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

    const h2s = [];
    visit(tree, "heading", (node) => {
      if (node.depth === 2) h2s.push(toString(node));
    });
    for (const i of faqIssues(fm.faq, h2s)) add(i.level, "faq", i.message);
    if (priceMentions(fm.faq.map((f) => `${f.q}\n${f.a}`).join("\n")).length > 0) {
      add("error", "price", "typed price in the faq; prices come only from ::pricing");
    }

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

// FAQ links live in data/faq.ts, not in an article, so check them once per
// full run: a renamed or drafted target would otherwise ship a dead link.
if (!fileArgs.length) {
  const { faqs } = await import(pathToFileURL(faqFile).href);
  for (const f of faqs) {
    const href = f.more?.href;
    if (href?.startsWith("/") && !internalTargetExists(href)) {
      console.log(path.relative(process.cwd(), faqFile));
      console.log(`  error [faq]: more.href does not resolve to a published page: ${href}`);
      errors++;
    }
  }
}

// Link graph: who links to whom, from contextual links only.
if (linkGraph && !fileArgs.length) {
  const inbound = new Map(); // target key -> Set of source labels
  const outbound = new Map(); // article key -> Set of other article keys
  const published = allArticles.filter((a) => knownSlugs.has(`${a.type}/${a.slug}`));
  for (const a of published) {
    inbound.set(`${a.type}/${a.slug}`, new Set());
    outbound.set(`${a.type}/${a.slug}`, new Set());
  }
  const addLink = (source, target) => {
    if (!target || target === source) return;
    inbound.get(target).add(source);
    if (outbound.has(source)) outbound.get(source).add(target);
  };
  for (const a of published) {
    const key = `${a.type}/${a.slug}`;
    try {
      const { data, body } = readFrontmatter(a.file);
      for (const rel of Array.isArray(data.related) ? data.related : []) {
        addLink(key, knownSlugs.has(`${a.type}/${rel}`) ? `${a.type}/${rel}` : null);
      }
      visit(parseMdast(body), "link", (node) => {
        const internal = toInternal(node.url);
        if (internal) addLink(key, articleKey(internal));
      });
    } catch {
      // A broken file is reported by lintFile.
    }
  }
  const { faqs } = await import(pathToFileURL(faqFile).href);
  for (const f of faqs) {
    const href = f.more?.href;
    if (href?.startsWith("/")) addLink("homepage FAQ", articleKey(href));
  }
  for (const a of published) {
    const key = `${a.type}/${a.slug}`;
    const issues = [];
    const inN = inbound.get(key).size;
    const outN = outbound.get(key).size;
    if (inN === 0) {
      issues.push(["error", `no contextual inbound links; link to /${key} from an older article (body or related)`]);
    } else if (inN < 2) {
      issues.push(["warn ", `${inN} contextual inbound link (2 or more wanted); add one from another article`]);
    }
    if (published.length >= 3 && outN < 2) {
      issues.push(["warn ", `${outN} outbound links to other articles (2 or more wanted)`]);
    }
    if (issues.length) {
      console.log(path.relative(process.cwd(), a.file));
      for (const [level, msg] of issues) console.log(`  ${level} [link-graph]: ${msg}`);
    }
    errors += issues.filter(([l]) => l === "error").length;
    warnings += issues.filter(([l]) => l !== "error").length;
  }
}

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
