# Room Redo article style guide

Single source of rules for article writing (`writer` agent) and checking (`guard` agent). Read this file and `FACTS.md` fully at the start of every run. If a brief conflicts with this file, this file wins; flag the conflict.

## 1. Value first, then Room Redo (read first)

Every article is Room Redo's own content, published on Room Redo's site, and it still promotes the app. But we show value to the reader first. The article answers the search; Room Redo is the fastest way to apply that answer to your own room.

- **The remove-the-app test.** Delete every Room Redo mention. The article must still answer the search and be worth bookmarking. If it doesn't, rewrite it.
- **About 70% reader help, 30% product.** Reader help means design guidance, how-tos, decisions, mistakes to avoid, measurements, palettes and layouts. Product sections show the advice applied in a real room ("here's that rule in a narrow spare room"), not a feature tour.
- **Cut generic pitch lines.** Any line that could appear on any app's site goes.
- **Intro answers the question directly.** It may keep one sentence saying Room Redo is an iPhone app ("Redesign your room on your iPhone"), so the right readers self-select. No negative caveats like "sorry, Android users".
- **First H2 is pure value.** The mid `::cta` goes after the first value section, never before it.
- **Honest means true, not self-critical.** Every claim must be true and provable (see `FACTS.md`). We don't argue against ourselves, dwell on limits, or add "when another tool fits better" sections.
- **Never send readers to competitors.** Don't link to competitor sites or recommend them. Comparison articles (later) may name competitors fairly and accurately, but are written to show where Room Redo wins.
- State the free offer exactly as `FACTS.md` gives it. Paid plans get a short, confident "what's free, what's paid" section, not a warning. Overselling "free" is a factual error.

## 2. Voice

Write like a friend who's good at rooms, talking to a homeowner or renter. Calm, specific, a bit opinionated.

- Plain words a homeowner uses: sofa, rug, wall, light. Not "seating element" or "vertical surface".
- Second person: "your room", "your photo".
- Short sentences, varied rhythm. Mix a 4-word sentence with a 20-word one. Average under 18 words.
- Paragraphs of 1 to 3 sentences, 4 at most.
- Take clear positions ("Start with the rug, not the sofa"). Don't hedge everything.
- Concrete over abstract: name the object, the colour, the material, the size.
- Never call the output "AI art" or "a render". It's a redesign of your room.
- No exclamation marks. No hype. Let the before/after image do the selling.
- American English (the audience is US).

### Hard bans (the linter fails the build)

- **No em dashes (—)** and no en dashes used as dashes. Use a full stop, comma, colon or brackets.
- Nothing from `BANNED.txt`.

### AI tells to avoid (the guard flags these)

- Openers like "In today's world", "Are you looking for", "Whether you're a ... or a ...", "In this article we'll".
- "Not just X, but Y" / "It's not X, it's Y" constructions.
- Groups of three everywhere ("calm, cozy and inviting").
- Trailing "-ing" clauses that fake importance ("..., creating a sense of harmony").
- "Serves as", "stands as" instead of "is".
- Vague attribution ("experts say", "studies show") without a link.
- Every section built the same way; every paragraph starting with "This", "The", "With" or "By".
- Too much bold, emoji bullets, Title Case Headings, a closing "In conclusion" summary.
- Any sentence that would read the same on a different app's site. Rewrite it.

## 3. Facts and sources

- **Product facts** come only from `FACTS.md`. If it isn't there, don't write it.
- **External facts** (trends, stats, design rules of thumb with numbers, prices of other things) need an inline link to a credible source the writer actually opened. No source, no claim.
- No invented numbers, quotes, testimonials, user counts or ratings.
- No provider names, ever.
- Images: only real Room Redo outputs or real photos. Every Room Redo output is labelled as an AI redesign (`isAiRedesign: true` and a visible label). Alt text describes what's in the image, truthfully.

## 4. SEO checklist (writer must meet; guard verifies)

- One search intent per article. Read the live top 10 for the primary keyword before writing, and make the article clearly better: more specific, real images, a straight answer, and real help a reader can use without the app.
- `seoTitle` up to 60 characters, contains the primary keyword, reads like a human title. `title` (the H1) can be longer and more natural.
- `description` 110 to 155 characters, contains the primary keyword, makes someone want to click, not a copy of the intro.
- Primary keyword in the first 100 words, in at least one H2, and used naturally. Never stuff. Secondary keywords appear where they fit.
- **Answer first.** The first paragraph answers the query directly. Question-style H2s get a one-sentence direct answer, then detail.
- No `#` (H1) in the body. Body headings start at `##`. Sentence case headings.
- Internal links: link to the homepage or an existing article where it helps the reader, with descriptive anchor text (not "click here"). Only link to pages that exist. `related` lists existing slugs only.
  - Link to at least 2 existing articles where they are relevant, with descriptive anchors.
  - A new article gets links from 1 or 2 older articles, added in the same PR (the pipeline's "Link back" step).
- External links: 1 to 3 credible, non-competitor sources where they back a claim.
- CTA: one `::cta` around the middle, after the first value section (never before it). The end CTA is added automatically, so the last paragraph should lead naturally into trying the app, without summarizing the article.
- Images: a hero, at least one `::before-after` with a real Room Redo result. Descriptive alt text on every image.
- Length by type:
  - `guides`: 900 to 1,800 words.
  - `ideas`: 1,200 to 2,500 words.
  - Length follows the intent. Don't pad.

## 5. Formatting and allowed blocks

Markdown plus these directives only (anything else fails the build):

Each directive goes on its own line. The syntax is defined in `lib/content/directives.ts`; if this list and that file disagree, the code wins.

- `::before-after{before="/images/articles/<slug>/x-before.webp" after="/images/articles/<slug>/x-after.webp" beforeAlt="..." afterAlt="..." caption="optional"}`
- `::cta`: the mid-article App Store CTA. Write it **once**, around the middle.
  - **Don't write an end CTA.** The layout adds the end CTA automatically after the body.
  - Use `::cta{variant="end" title="..." text="..."}` only to replace the default end copy, and then only once, as the last line.
- `::style-card{ids="japandi scandinavian"}`: 1 to 4 styles from `data/styles.ts`. Optional `text="japandi: one line | scandinavian: one line"`.
- Body images: `![alt](/images/articles/<slug>/x.webp)`. Every body image gets the AI redesign label by default; for a real, non-AI photo add the title `"photo"`: `![alt](/images/x.webp "photo")`. Alt text is required.

Visual blocks (full syntax in `lib/content/directives.ts`):

- `::pricing`: the shared plans-and-packs table, rendered from `data/pricing.ts`. **This is the only way to show prices.** Never type a price in an article; the linter rejects `$` amounts in the body. Optional attributes: `groups="plans packs"` and `footnote="off"`. Don't repeat the footnote's renewal or cancel wording in the paragraph next to it.
- `:::at-a-glance`: a key-facts box with 3 to 5 `- Label: value` bullets. Put it right after the intro paragraph. One per article.
- `:::steps`: 2 to 5 numbered steps written as an ordered list. Start each step with a **bold title**, then one line. An optional image per step gets the AI label unless titled `"photo"`.
- `:::looks{before="..." beforeAlt="..." caption="..."}`: the same room in 2 to 4 styles. Write one image per look, with the style name as the image title: `![alt](/images/...webp "Japandi")`.
- `:::style-slider{before="..." beforeAlt="..." caption="..."}`: a before/after slider with one tappable style chip per look; the reader taps a style, then drags the divider. `before` and `beforeAlt` are required. Write 2 to 4 images, each with the style name (up to 24 characters, no repeats) as its title, the look the text talks about first: `![AI redesign of ...](/images/...webp "Scandinavian")`. Use `::before-after` for a single after image, and `:::looks` for a static grid. Introduce it with a sentence that tells the reader to tap a style and drag.
- `:::tip` and `:::note`: one short point (up to 45 words) with an optional `title`. At most one per 500 words (minimum 1 allowed), and 3 per article.
- Markdown tables: use them wherever the content is a comparison or a list of facts. On mobile, tables with 3 or more columns turn into cards automatically.

**FAQ:** put secondary questions in frontmatter `faq: [{q, a}]`, with 3 to 8 items and answers of up to 70 words. They render collapsed at the end, before the end CTA, and Google still reads them. Keep the **primary-intent question** as a visible H2 section in the body (e.g. "Is it really free?"). Move the smaller questions (sign-up, Android, photo tips) into `faq`.

YAML: quote any frontmatter value that contains a colon (most often `description`).

Lists are fine, but not every section.

## 5b. Visual rhythm (readers scan with their eyes)

A visual block is any of: `::before-after`, `::style-card`, `:::looks`, `:::style-slider`, `:::steps`, `:::at-a-glance`, `::pricing`, `:::tip`, `:::note`, a markdown table, a body image, or `::cta`. The hero, the end CTA and the FAQ don't count.

The linter checks these rules and the guard verifies them:
1. No more than 250 words of body text in a row without a visual block. The linter warns at 250 and fails at 350. Headings don't reset the count.
2. The first visual block starts within the first 200 words. Ideally it's `:::at-a-glance`.
3. Every article has at least one table or `::pricing`, plus one `:::at-a-glance`. Guides of 900 words or more also have a `:::steps`, a `:::looks` or a `:::style-slider`.
4. Callout budget: see `:::tip` above. One `:::at-a-glance` and one `::pricing` per article at most.
5. Put at least one sentence between two visual blocks; don't stack them.
6. Any H2 section longer than 150 words includes a list or a visual block.
7. No more than two H2 sections in a row that are mostly a list.
8. Reuse, don't retype: prices only through `::pricing`, FAQ answers only in frontmatter.

## 6. Frontmatter

Follow the schema in `lib/content/schema.ts`. Set `author: aleksander`. `datePublished` = the date of first publish. Change `dateModified` only for substantive edits, never to look fresh.
