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

  let code: string | undefined;
  let message: string | undefined;
  try {
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: normalized, source, user_agent: userAgent });
    code = error?.code;
    message = error?.message;
    if (error && !code) code = "unknown";
  } catch (err) {
    code = "exception";
    message = err instanceof Error ? err.message : String(err);
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
