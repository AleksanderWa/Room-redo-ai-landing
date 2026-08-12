# Room Redo AI — waitlist landing page

Single-page Next.js (App Router) waitlist landing page for Room Redo AI, ported from the approved design export `Room Redo AI.dc.html`. See `/Users/aleksander/.claude/plans/and-here-is-the-reactive-blossom.md` for the full implementation plan.

## Setup

1. **Install deps**: `npm install`
2. **Add design assets**: place the `design-assets/` folder (source JPEGs) in the repo root, then run:
   ```bash
   bash scripts/copy-assets.sh
   node scripts/generate-og-image.mjs
   ```
   This populates `public/images/*.jpg` and generates `public/og.jpg` (1200×630).
3. **Supabase**: create a project, run `supabase/migrations/0001_create_waitlist.sql` (SQL editor, or via the Supabase MCP once authenticated), then copy `.env.example` to `.env.local` and fill in `SUPABASE_URL` / `SUPABASE_ANON_KEY` (the anon key — never the service role key; the migration's RLS policy is insert-only).
4. **Run**: `npm run dev`, open http://localhost:3000

## Notes

- Inline-style porting approach (no Tailwind) — see the plan file for why.
- Rate limiting on `/api/waitlist` is a best-effort in-memory limiter (see `lib/ratelimit.ts`) — swap for Upstash Redis if real abuse shows up.
- `data/steps.ts` fixes a continuity bug in the source design (three different rooms across the "How it works" steps); `public/images/detail-japandi.jpg` is copied per the asset mapping but intentionally unused after that fix.
- `app/icon.tsx` is a placeholder monogram favicon — the source design has no logo, only a text wordmark. Swap it for a real mark if one exists.

## Deploy

Vercel (`roomredoai.com` primary, `airoomredo.com` redirects to it — see the plan file §7 for domain/DNS steps). Env vars needed in Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
