# Room Redo AI — landing page

Single-page Next.js (App Router) landing page for Room Redo AI. The current layout follows the approved redesign mockups (desktop `Main.dc.html`, mobile `Mobile.dc.html`): hero slider, style wall of all 47 styles, wild styles, corners, how it works, pricing teaser, FAQ, closing CTA.

## Setup

1. **Install deps**: `npm install`
2. **Assets** (already committed; only needed to refresh them): the style thumbs and app icon come from the RoomRedo app repo. The corners section (`components/CornerShowcase.tsx`) shows the app's under-stairs photo against the app's corner-flow results for it, listed in `scripts/corner-results.json` (id, file, chip label, group, caption, alt; the page reads the same file). `scripts/make-corner-crops.mjs` aligns each result to the photo and cuts all of them with one shared 3:4 crop; `copy-assets.sh` runs it and needs `CORNER_RESULTS_DIR` pointing at the folder of result images: while any entry has a `file`, it exits with an error if that isn't set. It also deletes `understairs-<id>.jpg` files whose id is no longer in the JSON. To add a result (e.g. "Store things"), set its `file` in the JSON and re-run; a chip only appears once its image exists in `public/images/corner/` (the build warns about an entry with a `file` but no image).
   ```bash
   APP_REPO=../Room-redo-app BACKEND_REPO=../room-redo-backend CORNER_RESULTS_DIR=/path/to/corner-results \
     bash scripts/copy-assets.sh   # repos default to these sibling paths
   node scripts/generate-og-image.mjs                      # only if storage-after.jpg changed
   ```
   The hero pair (720x1280) is the backend's cluttered-bedroom QA photo and the app's Japandi result for it, aligned and cropped to 9:16 by `scripts/make-hero-crops.mjs`, which the script runs; it also builds `step-reveal.jpg` ("How it works" step 3, a half-before/half-after split). Run `node scripts/make-hero-crops.mjs` by hand for the alignment proof composites. If a `design-assets/` folder (the original design export) is in the repo root, the script also refreshes storage-after.jpg (the OG image source) from it. When the app adds a style, add its thumb via the script and an entry to `data/styles.ts`.
3. **Supabase**: see "Make the waitlist live" below. For local dev, copy `.env.example` to `.env.local` and fill in the URL and anon key (`NEXT_PUBLIC_STORAGE_SUPABASE_URL` / `STORAGE_SUPABASE_ANON_KEY`, or the fallback names `SUPABASE_URL` / `SUPABASE_ANON_KEY`). The anon key only, never the service-role key: the table's RLS policy is insert-only. With neither set, the form still renders and `/api/waitlist` answers 503.
4. **App Store link**: set `NEXT_PUBLIC_APP_STORE_URL` to the App Store listing URL once the app is live (see `.env.example`). It's inlined at build time, so redeploy after changing it. While it's unset, every App Store button (header, hero, closing CTA) renders as a non-link "Coming soon on the App Store" with the waitlist form beneath it. Once set, the buttons link to the listing and each click is tracked in Vercel Analytics as `app_store_click` with a `placement` of `header`, `hero` or `close`.
5. **Run**: `npm run dev`, open http://localhost:3000

## Make the waitlist live

The `waitlist` table was created by hand in the Supabase dashboard (`id int8, created_at timestamptz, email varchar, ip varchar, user_agent varchar`). `supabase/migrations/0001_create_waitlist.sql` is historical (a uuid-keyed table that was never created); `0002_align_waitlist.sql` brings the real table in line with the route.

1. Run `supabase/migrations/0002_align_waitlist.sql` in the Supabase SQL editor. It's idempotent: adds `source`, makes sure `id`/`created_at` have defaults, adds a case-insensitive unique index on email, enables RLS with an insert-only `anon` policy and grants `anon` insert.
2. In Vercel, confirm `NEXT_PUBLIC_STORAGE_SUPABASE_URL` and `STORAGE_SUPABASE_ANON_KEY` exist for Production and Preview (the Supabase integration adds them).
3. Redeploy.
4. Open `/api/waitlist/health`. Expect `{"configured":true,"missing":[],"reachable":true}`, usually with `"note":"select blocked by RLS (expected)"`. `configured:false` lists the missing env vars; `reachable:false` means Supabase didn't answer. It never returns rows.
5. Submit a test email on the site and check it appears in Table Editor → `waitlist`.

What gets stored: `email` (lowercased), `source` (attribution) and `user_agent` (truncated to 300 chars). `ip` is left null on purpose.

Failures: missing config logs the missing var names and returns 503; any insert error other than a duplicate (23505 → 409, "you're already in") is logged as one JSON line, `{"event":"waitlist_insert_failed","code",...,"email"}`, and returns 500. Both show the form's generic "Something went wrong" message. **PII trade-off:** that log line includes the email so a signup lost to an outage can be recovered from the Vercel logs; it means emails from failed inserts sit in Vercel's log retention. Drop the `email` field from the log in `app/api/waitlist/route.ts` if that's not acceptable.

## Notes

- Styling: inline `style` props for static styles, plus `.rr-*` classes in `app/globals.css` for tokens (`--rr-*` CSS variables) and anything responsive (breakpoints at 700px and 1100px). No Tailwind.
- Section reveal is a CSS scroll-driven fade-up (`.rr-reveal`); it's skipped under `prefers-reduced-motion` and in browsers without `animation-timeline` support.
- Rate limiting on `/api/waitlist` is a best-effort in-memory limiter (see `lib/ratelimit.ts`) — swap for Upstash Redis if real abuse shows up.
- `data/faq.ts` feeds both the FAQ section and the homepage's `FAQPage` JSON-LD; edit it there and both stay in sync.
- `app/icon.png` is the app's icon (`assets/icon-master.png` in the app repo), as a static file rather than a dynamic `icon.tsx` route because `next/image`'s optimizer and `next/og` share one process-wide `sharp`/libvips instance; the optimizer permanently blocks libvips' SVG loader (a hardcoded security measure) the first time it processes a real photo, which then breaks `ImageResponse`'s SVG→PNG rendering for the rest of the dev server's life. A static file sidesteps that pipeline entirely.

## Deploy

Vercel (`www.airoomredo.com` is the canonical site; both `airoomredo.com` and `roomredoai.com` serve the same project — see the plan file §7 for domain/DNS steps). Env vars needed in Vercel: `NEXT_PUBLIC_STORAGE_SUPABASE_URL` and `STORAGE_SUPABASE_ANON_KEY` (added by the Supabase integration), `NEXT_PUBLIC_APP_STORE_URL` once the app is live, and `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` (product analytics + session replay via `instrumentation-client.ts`; unset key disables it; the PostHog project must allow `airoomredo.com` and `www.airoomredo.com`).
