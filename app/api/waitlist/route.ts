import { getSupabase, getSupabaseConfig } from "@/lib/supabase";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { isValidEmail, normalizeEmail } from "@/lib/validators";

export const runtime = "nodejs";

// `source` and `user_agent` are optional columns: a table that predates
// 0002_align_waitlist.sql lacks `source`, and PostgREST rejects the whole
// insert (PGRST204). A column found missing is remembered for the life of
// this server instance, so later requests skip it without a failed insert.
const OPTIONAL_COLUMNS = ["source", "user_agent"] as const;
type OptionalColumn = (typeof OPTIONAL_COLUMNS)[number];
const missingColumns = new Set<OptionalColumn>();

// e.g. "Could not find the 'source' column of 'waitlist' in the schema cache";
// tolerant of single, double, back or no quotes around the name.
function missingColumnIn(message: string | undefined): OptionalColumn | null {
  const name = message?.match(/["'`]?(\w+)["'`]?\s+column/)?.[1];
  return OPTIONAL_COLUMNS.find((c) => c === name) ?? null;
}

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

  const payload: Record<string, string | null> = {
    email: normalized,
    source,
    user_agent: userAgent,
  };
  // Values dropped because their column is missing; logged with the email so
  // attribution can be recovered once the migration has run.
  const dropped: Partial<Record<OptionalColumn, string | null>> = {};
  for (const column of missingColumns) {
    dropped[column] = payload[column];
    delete payload[column];
  }
  if (missingColumns.size > 0) {
    console.info(
      JSON.stringify({ event: "waitlist_columns_skipped", email: normalized, dropped })
    );
  }

  let code: string | undefined;
  let message: string | undefined;
  // At most one retry per optional column.
  for (let attempt = 0; attempt <= OPTIONAL_COLUMNS.length; attempt++) {
    try {
      const { error } = await supabase.from("waitlist").insert(payload);
      code = error ? error.code || "unknown" : undefined;
      message = error?.message;
    } catch (err) {
      code = "exception";
      message = err instanceof Error ? err.message : String(err);
    }

    const column = code === "PGRST204" ? missingColumnIn(message) : null;
    if (!column || !(column in payload)) break;

    missingColumns.add(column);
    console.warn(
      JSON.stringify({
        event: "waitlist_column_missing",
        column,
        email: normalized,
        droppedValue: payload[column],
      })
    );
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
