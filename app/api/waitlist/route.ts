import { getSupabase } from "@/lib/supabase";
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

  const { error } = await getSupabase()
    .from("waitlist")
    .insert({ email: normalized, source: body.source ?? null });

  if (error) {
    if (error.code === "23505") {
      // unique_violation on waitlist.email
      return Response.json({ status: "dup" }, { status: 409 });
    }
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  return Response.json({ status: "success" }, { status: 200 });
}
