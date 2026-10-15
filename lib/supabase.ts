import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client. Deliberately uses the anon key (never the service role
// key): the `waitlist` table's RLS policy only grants INSERT to `anon`, with
// no SELECT/UPDATE/DELETE policy at all, so the anon key is already
// least-privilege for what this route needs. The browser never talks to
// Supabase directly, only to our own /api/waitlist route handler, which runs
// exclusively server-side.
//
// Env names: the Vercel Supabase integration creates `STORAGE_`-prefixed
// vars, so those are read first; the plain names are a fallback for local
// `.env.local` setups. Each entry is [preferred, fallback].
const URL_VARS = ["NEXT_PUBLIC_STORAGE_SUPABASE_URL", "SUPABASE_URL"] as const;
const KEY_VARS = ["STORAGE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"] as const;

// Looked up by computed key on purpose: Next inlines literal
// `process.env.NEXT_PUBLIC_*` references at build time (server code
// included), which would freeze the URL to whatever the build saw. A
// dynamic lookup is read at request time instead.
function readEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

export type SupabaseConfig =
  | { ok: true; url: string; anonKey: string }
  | { ok: false; missing: string[] };

export function getSupabaseConfig(): SupabaseConfig {
  const url = readEnv(URL_VARS);
  const anonKey = readEnv(KEY_VARS);
  if (url && anonKey) return { ok: true, url, anonKey };

  const missing: string[] = [];
  if (!url) missing.push(URL_VARS.join(" (or ") + ")");
  if (!anonKey) missing.push(KEY_VARS.join(" (or ") + ")");
  return { ok: false, missing };
}

// Built lazily (not at module top-level) so `next build`'s static route
// analysis, which evaluates this module without request-scoped env vars,
// doesn't fail. Returns null when config is missing; callers decide how to
// respond (the route answers 503, the health check reports it).
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const config = getSupabaseConfig();
  if (!config.ok) return null;

  client = createClient(config.url, config.anonKey, {
    auth: { persistSession: false },
  });
  return client;
}
