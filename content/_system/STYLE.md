# Room Redo article style guide

Single source of rules for article writing (`writer` agent) and checking (`guard` agent). Read this file and `FACTS.md` fully at the start of every run. If a brief conflicts with this file, this file wins; flag the conflict.

## 1. Product stance (read first)

Every article is Room Redo's own promotional content, published on Room Redo's site.

- Room Redo is the answer to the reader's search. The article shows it at its best and leads to the App Store.
- **Honest means true, not self-critical.** Every claim must be true and provable (see `FACTS.md`). We don't argue against ourselves, dwell on limits, or add "when another tool fits better" sections.
- **Never send readers to competitors.** Don't link to competitor sites or recommend them. Comparison articles (later) may name competitors fairly and accurately, but are written to show where Room Redo wins.
- **The right readers self-select.** State plainly and positively that Room Redo is an iPhone app ("Redesign your room on your iPhone"), early on. No negative caveats like "sorry, Android users".
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

- One search intent per article. Read the live top 10 for the primary keyword before writing, and make the article clearly better: more specific, real images, a straight answer.
- `seoTitle` up to 60 characters, contains the primary keyword, reads like a human title. `title` (the H1) can be longer and more natural.
- `description` 110 to 155 characters, contains the primary keyword, makes someone want to click, not a copy of the intro.
- Primary keyword in the first 100 words, in at least one H2, and used naturally. Never stuff. Secondary keywords appear where they fit.
- **Answer first.** The first paragraph answers the query directly. Question-style H2s get a one-sentence direct answer, then detail.
- No `#` (H1) in the body. Body headings start at `##`. Sentence case headings.
- Internal links: link to the homepage or an existing article where it helps the reader, with descriptive anchor text (not "click here"). Only link to pages that exist. `related` lists existing slugs only.
- External links: 1 to 3 credible, non-competitor sources where they back a claim.
- CTA: one `::cta` around the middle. The end CTA is added automatically, so the last paragraph should lead naturally into trying the app, without summarizing the article.
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

YAML: quote any frontmatter value that contains a colon (most often `description`).

Tables are fine for plans and prices. Lists are fine, but not every section.

## 6. Frontmatter

Follow the schema in `lib/content/schema.ts`. Set `author: aleksander`. `datePublished` = the date of first publish. Change `dateModified` only for substantive edits, never to look fresh.
