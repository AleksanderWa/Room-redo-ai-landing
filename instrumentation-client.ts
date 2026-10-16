import posthog from "posthog-js";

// Product analytics + session replay. Fully off unless NEXT_PUBLIC_POSTHOG_KEY
// is set (local dev / CI / previews without the var). Events go through the
// same-origin /ingest rewrite (see next.config.ts) to survive ad blockers.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  try {
    posthog.init(key, {
      api_host: "/ingest",
      ui_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace("us.i.", "us.") ??
        "https://us.posthog.com",
      defaults: "2026-01-30",
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: false,
      session_recording: {
        // The waitlist form collects emails: never record typed values.
        maskAllInputs: true,
      },
    });
  } catch {
    // Analytics must never break the page.
  }
}
