import { z } from "zod";

// Pure module (zod only): imported by the Next.js loader and, through Node's
// type stripping, by scripts/lint-articles.mjs. Keep it free of `@/` imports
// and of TypeScript-only runtime features (enums, parameter properties).

export const ARTICLE_TYPES = ["guides", "ideas"] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

/** Types whose routes exist. Anything that turns articles into public URLs
 *  (sitemap, feed, hub) goes through this. A hub only goes live once its type
 *  has a non-draft article (see hasPublished in load.ts). */
export const PUBLISHED_TYPES: readonly ArticleType[] = ["guides", "ideas"];

/** Allowed body length (words) per article type. */
export const WORD_RANGE: Record<ArticleType, { min: number; max: number }> = {
  guides: { min: 900, max: 1800 },
  ideas: { min: 1200, max: 2500 },
};

/** FAQ accordion limits. Fewer than FAQ_MIN renders nothing (the linter warns). */
export const FAQ_MIN = 3;
export const FAQ_MAX = 8;
export const FAQ_Q_MAX = 90;
export const FAQ_A_WORDS = 70;

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** App Store Connect caps a campaign token (`ct`) at 40 chars; we stay at 30. */
export const CAMPAIGN_MAX = 30;

// gray-matter hands unquoted YAML dates (2026-10-20) over as Date objects.
const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a YYYY-MM-DD date"),
);

const faqItem = z
  .object({
    // Plain text; the linter checks the question mark and that it is not an H2 too.
    q: z.string().trim().min(1, "faq q is required").max(FAQ_Q_MAX, `faq q is over ${FAQ_Q_MAX} characters`),
    // Inline markdown only (checked by the linter).
    a: z
      .string()
      .trim()
      .min(1, "faq a is required")
      .refine((a) => a.split(/\s+/).length <= FAQ_A_WORDS, `faq a is over ${FAQ_A_WORDS} words`),
  })
  .strict();

export const articleSchema = z
  .object({
    title: z.string().min(10).max(110),
    // The <title> tag. Contains the primary keyword (checked by the linter).
    seoTitle: z.string().min(10).max(60),
    description: z.string().min(110).max(155),
    type: z.enum(ARTICLE_TYPES),
    slug: z.string().regex(SLUG_RE, "must be lowercase words joined by hyphens"),
    datePublished: isoDate,
    // Changes only on substantive edits; never bumped to look fresh. Feeds the
    // sitemap lastmod, so it must never be generated.
    dateModified: isoDate,
    author: z.literal("aleksander"),
    primaryKeyword: z.string().min(2),
    secondaryKeywords: z.array(z.string().min(2)).default([]),
    // Ids from data/styles.ts, checked by the loader and the linter.
    appStyles: z.array(z.string()).default([]),
    hero: z.object({
      src: z.string().startsWith("/images/"),
      alt: z.string().trim().min(1, "hero.alt is required"),
      // Every app generation is labelled "AI redesign"; a hero that is not
      // one (a real photo) is the only reason to set this false.
      isAiRedesign: z.boolean(),
    }),
    heroCaption: z.string().optional(),
    related: z.array(z.string()).default([]),
    reviewedBy: z.string().optional(),
    guardReport: isoDate.optional(),
    // Drafts are excluded from production builds.
    draft: z.boolean().default(false),
    // Mobile sticky App Store bar. On for promotional guides, opt out for
    // purely informational pages.
    stickyCta: z.boolean().default(false),
    // Collapsed accordion after the body, before the end CTA. Short secondary
    // questions only; the primary-intent question stays an H2 in the body.
    faq: z.array(faqItem).max(FAQ_MAX, `at most ${FAQ_MAX} FAQ items; split the article`).default([]),
    // App Store campaign token for install attribution (`ct`).
    campaign: z.object({ ct: z.string().min(1).max(CAMPAIGN_MAX) }).optional(),
  })
  .strict()
  .superRefine((a, ctx) => {
    if (a.dateModified < a.datePublished) {
      ctx.addIssue({
        code: "custom",
        path: ["dateModified"],
        message: "dateModified is before datePublished",
      });
    }
    if (!a.campaign && `article-${a.slug}`.length > CAMPAIGN_MAX) {
      ctx.addIssue({
        code: "custom",
        path: ["campaign"],
        message: `default campaign "article-${a.slug}" is over ${CAMPAIGN_MAX} chars; set campaign.ct`,
      });
    }
  })
  .transform((a) => ({
    ...a,
    campaign: { ct: a.campaign?.ct ?? `article-${a.slug}` },
  }));

export type ArticleFrontmatter = z.output<typeof articleSchema>;
