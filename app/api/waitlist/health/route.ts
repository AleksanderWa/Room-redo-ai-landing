import { getSupabase, getSupabaseConfig } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Health = {
  configured: boolean;
  missing: string[];
  reachable?: boolean;
  note?: string;
};

// Ops check for the waitlist: is Supabase configured, and does it answer?
// Never returns rows (or even the row count): the probe is a HEAD request
// with limit(0), and only its status is inspected.
export async function GET() {
  const config = getSupabaseConfig();
  const supabase = getSupabase();
  if (!config.ok || !supabase) {
    const body: Health = {
      configured: false,
      missing: config.ok ? [] : config.missing,
    };
    return Response.json(body, { status: 503 });
  }

  const { error, status } = await supabase
    .from("waitlist")
    .select("id", { head: true, count: "exact" })
    .limit(0)
    .abortSignal(AbortSignal.timeout(5000));

  const body: Health = { configured: true, missing: [] };
  if (!error) {
    body.reachable = true;
  } else if (status === 0) {
    // postgrest-js reports fetch failures (DNS, timeout, refused) as status 0.
    body.reachable = false;
    body.note = `network error: ${error.message}`;
  } else if (status === 401 || status === 403 || error.code === "42501") {
    // Expected: the anon role has no SELECT policy. A HEAD response has no
    // body, so an invalid anon key (also 401) looks the same here.
    body.reachable = true;
    body.note = "select blocked by RLS (expected)";
  } else {
    // Supabase answered, but with something unexpected (e.g. 404 when the
    // table doesn't exist).
    body.reachable = true;
    body.note = `unexpected status ${status}${error.code ? ` (${error.code})` : ""}`;
  }

  return Response.json(body, { status: body.reachable ? 200 : 503 });
}
