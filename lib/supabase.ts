import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client. Deliberately uses the anon key (never the service role
// key): the `waitlist` table's RLS policy only grants INSERT to `anon`, with
// no SELECT/UPDATE/DELETE policy at all, so the anon key is already
// least-privilege for what this route needs. These env vars are NOT
// NEXT_PUBLIC_-prefixed on purpose — the browser never talks to Supabase
// directly, only to our own /api/waitlist route handler, which runs
// exclusively server-side.
//
// Built lazily (not at module top-level) so `next build`'s static route
// analysis — which evaluates this module without request-scoped env vars —
// doesn't fail; the real check happens the first time a request actually
// needs the client.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables."
    );
  }

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  return client;
}
