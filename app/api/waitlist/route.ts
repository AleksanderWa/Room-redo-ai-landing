import { getSupabase, getSupabaseConfig } from "@/lib/supabase";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { isValidEmail, normalizeEmail } from "@/lib/validators";

export const runtime = "nodejs";

type Body = {
  email?: string;
  source?: string | null;
  company?: string; // honeypot
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  // Honeypot: bots fill every field. Accept silently, write nothing, log
  // nothing that could contain attacker-supplied data.
  if (body.company) {
    return Response.json({ status: "success" }, { status: 200 });
  }

  const ip = getClientIp(req);
  if (!rateLimit(ip)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const normalized = normalizeEmail(body.email ?? "");
  if (!isValidEmail(normalized)) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    const config = getSupabaseConfig();
    const missing = config.ok ? [] : config.missing;
    console.error(
      `waitlist: Supabase is not configured; missing ${missing.join(", ")}`
    );
    return Response.json({ error: "unavailable" }, { status: 503 });
  }

  const source = body.source ?? null;
  // `ip` is left null on purpose (privacy); the user agent is kept, capped.
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;

  // `source` and `user_agent` are optional columns: a table that predates
  // 0002_align_waitlist.sql lacks `source`, and PostgREST rejects the whole
  // insert (PGRST204). Drop the column it names and retry, at most once per
  // optional column, so signups keep landing until the migration is run.
  const payload: Record<string, string | null> = {
    email: normalized,
    source,
    user_agent: userAgent,
  };
  const OPTIONAL_COLUMNS = ["source", "user_agent"];

  let code: string | undefined;
  let message: string | undefined;
  for (let attempt = 0; attempt <= OPTIONAL_COLUMNS.length; attempt++) {
    try {
      const { error } = await supabase.from("waitlist").insert(payload);
      code = error ? error.code || "unknown" : undefined;
      message = error?.message;
    } catch (err) {
      code = "exception";
      message = err instanceof Error ? err.message : String(err);
    }

    // e.g. "Could not find the 'source' column of 'waitlist' in the schema cache"
    const column = message?.match(/'(\w+)' column/)?.[1];
    if (
      code !== "PGRST204" ||
      !column ||
      !OPTIONAL_COLUMNS.includes(column) ||
      !(column in payload)
    ) {
      break;
    }
    console.warn(JSON.stringify({ event: "waitlist_column_missing", column }));
    delete payload[column];
  }

  if (code === "23505") {
    // unique_violation on lower(email)
    return Response.json({ status: "dup" }, { status: 409 });
  }
  if (code) {
    // Includes the email so a signup lost to an outage can be recovered from
    // the Vercel logs (a deliberate PII trade-off; see the README).
    console.error(
      JSON.stringify({
        event: "waitlist_insert_failed",
        code,
        message,
        source,
        email: normalized,
      })
    );
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  return Response.json({ status: "success" }, { status: 200 });
}
