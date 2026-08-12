// Best-effort, in-memory IP rate limiter for the waitlist API.
//
// This is intentionally NOT authoritative: Vercel serverless functions are
// stateless and ephemeral, so this Map is not shared across concurrent
// invocations, regions, or cold starts. It still blocks trivial rapid-fire
// abuse from a single warm instance at zero setup cost. The real integrity
// mechanisms are the `waitlist.email` unique constraint and the honeypot
// field. If real abuse shows up, swap this file's implementation for
// Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`) — every call site
// stays the same.

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5;

const hits = new Map<string, number[]>();

export function rateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(ip) ?? []).filter(
    (t) => now - t < WINDOW_MS
  );

  if (timestamps.length >= MAX_REQUESTS) {
    hits.set(ip, timestamps);
    return false;
  }

  timestamps.push(now);
  hits.set(ip, timestamps);

  // Opportunistic cleanup so the map doesn't grow unbounded over the life
  // of a warm instance.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return true;
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
