import posthog, { type CaptureOptions } from "posthog-js";

// No-op when PostHog isn't initialised (no NEXT_PUBLIC_POSTHOG_KEY).
export function captureEvent(
  event: string,
  properties?: Record<string, string | number | boolean | null>,
  options?: CaptureOptions,
) {
  try {
    if (posthog.__loaded) posthog.capture(event, properties, options);
  } catch {
    // ignore
  }
}

export function registerAttribution(source: string) {
  try {
    if (posthog.__loaded) posthog.register({ source });
  } catch {
    // ignore
  }
}
