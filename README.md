# Room Redo AI — landing page

Single-page Next.js (App Router) landing page for Room Redo AI. The current layout follows the approved redesign mockups (desktop `Main.dc.html`, mobile `Mobile.dc.html`): hero slider, style wall of all 47 styles, wild styles, corners, how it works, pricing teaser, FAQ, closing CTA.

## Setup

1. **Install deps**: `npm install`
2. **Assets** (already committed; only needed to refresh them): the style thumbs, corner images and app icon come from the RoomRedo app repo.
   ```bash
   APP_REPO=../Room-redo-app bash scripts/copy-assets.sh   # APP_REPO defaults to ../Room-redo-app
   node scripts/generate-og-image.mjs                      # only if the storage pair changed
   ```
   If a `design-assets/` folder (the original design export) is in the repo root, the script also refreshes the hero/storage images from it. When the app adds a style, add its thumb via the script and an entry to `data/styles.ts`.
3. **Supabase**: create a project, run `supabase/migrations/0001_create_waitlist.sql` (SQL editor, or via the Supabase MCP once authenticated), then copy `.env.example` to `.env.local` and fill in `SUPABASE_URL` / `SUPABASE_ANON_KEY` (the anon key — never the service role key; the migration's RLS policy is insert-only).
4. **App Store link**: set `NEXT_PUBLIC_APP_STORE_URL` to the App Store listing URL once the app is live (see `.env.example`). It's inlined at build time, so redeploy after changing it. While it's unset, every App Store button (header, hero, closing CTA) renders as a non-link "Coming soon on the App Store" with the waitlist form beneath it. Once set, the buttons link to the listing and each click is tracked in Vercel Analytics as `app_store_click` with a `placement` of `header`, `hero` or `close`.
5. **Run**: `npm run dev`, open http://localhost:3000

## Notes

- Styling: inline `style` props for static styles, plus `.rr-*` classes in `app/globals.css` for tokens (`--rr-*` CSS variables) and anything responsive (breakpoints at 700px and 1100px). No Tailwind.
- Section reveal is a CSS scroll-driven fade-up (`.rr-reveal`); it's skipped under `prefers-reduced-motion` and in browsers without `animation-timeline` support.
- Rate limiting on `/api/waitlist` is a best-effort in-memory limiter (see `lib/ratelimit.ts`) — swap for Upstash Redis if real abuse shows up.
- `data/faq.ts` feeds both the FAQ section and the homepage's `FAQPage` JSON-LD; edit it there and both stay in sync.
- `app/icon.png` is the app's icon (`assets/icon-master.png` in the app repo), as a static file rather than a dynamic `icon.tsx` route because `next/image`'s optimizer and `next/og` share one process-wide `sharp`/libvips instance; the optimizer permanently blocks libvips' SVG loader (a hardcoded security measure) the first time it processes a real photo, which then breaks `ImageResponse`'s SVG→PNG rendering for the rest of the dev server's life. A static file sidesteps that pipeline entirely.

## Deploy

Vercel (`roomredoai.com` primary, `airoomredo.com` redirects to it — see the plan file §7 for domain/DNS steps). Env vars needed in Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_STORE_URL` once the app is live.
