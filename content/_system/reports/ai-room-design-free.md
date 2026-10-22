# Guard report: ai-room-design-free (v3, round 1, 2026-10-21)

**Verdict: PASS.** Commit a659f70. There are 5 optional polish items, all applied after the guard (see below).

## Mechanical
- `npm run lint:articles -- content/guides/ai-room-design-free.md`: 0 errors, 0 warnings.
- No em dashes, en dashes or exclamation marks.
- Body: 1,682 words (guides 900–1,800).
- `seoTitle`: 56 characters. `description`: 154 characters. Both contain the primary keyword.
- The keyword is in the first sentence and in the H2 "Is this AI room design free, really?".
- The iPhone sentence is in the first sentence.
- The first H2 is pure value. The mid `::cta` comes after the photo section.

## Claims
- **20 claims checked.** All product claims are supported by FACTS.md, including the style count, which uses FACTS.md's "Safe wording". It overrides the v2 brief's ban.
- **External sources**, all verified live:
  - Sunset / Tim Clarke, open furniture;
  - Livingetc, the 60-30-10 rule;
  - House & Garden ZA / Jenny Komenda, choosing the rug first.
- **Images:** all 6 viewed; alt text and captions match.
- **Rulings:**
  - The photo-orientation advice is OK. The app shows portrait and landscape uncropped (`AdaptivePhoto.tsx`, `BeforeAfterSlider.tsx`).
  - There is no preservation or buyability implication.

## Scores
| Criterion | Score |
|---|---|
| Accuracy | 4 |
| First-hand value | 5 |
| Search intent | 4 |
| Naturalness and readability | 4 |
| Structure | 5 |
| Reader value | 4 |
| Promotional strength | 4 |

Average: 4.3.

**Value/product split:** about 70/30 (about 1,250 value words, about 450 product words).

**Generic pitch:** the mid-CTA lead-in ("If you'd like to try it on your own room now...") and "The whole thing happens on your iPhone, in four steps."

## Optional polish (applied by the writer after the guard)
1. In the People row of the photo table, "An empty room reads clearly" contradicts "leave the furniture". Change it to "A room with nobody in it reads clearly".
2. Rephrase the uncited "Floor is what tells the eye how big a room is..." as our own advice.
3. Tie the mid-CTA lead-in to the photo section.
4. Reduce the "X, not Y" sentence pattern to 1–2 instances.
5. Change the work-order table rug row so it doesn't contradict "choose the rug early", e.g. "Rug (chosen first, laid third)".

Polish items 1–5 were applied by the writer in the commit that adds this report (on top of a659f70); per-file lint after the changes: 0 errors, 0 warnings.
