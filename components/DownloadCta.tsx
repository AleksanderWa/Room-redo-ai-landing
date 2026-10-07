"use client";

import type { MouseEvent } from "react";
import { track } from "@vercel/analytics";
import WaitlistForm from "@/components/WaitlistForm";
import { APP_STORE_URL } from "@/lib/site";
import { focusWaitlist, waitlistInputId } from "@/lib/waitlistFocus";

type Placement = "header" | "hero" | "close";

function AppleLogo({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 384 512" aria-hidden="true">
      <path
        fill="currentColor"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
      />
    </svg>
  );
}

// How long a same-tab App Store click waits for the analytics event before
// navigating. `track()` only queues the event for Vercel's injected script
// (node_modules/@vercel/analytics: it calls window.va), so we can't rely on
// it being sent with keepalive/sendBeacon before the page unloads.
const TRACK_DELAY_MS = 150;

function onAppStoreClick(e: MouseEvent<HTMLAnchorElement>, placement: Placement) {
  track("app_store_click", { placement });
  // Modified or non-primary clicks open a new tab/window: the current page
  // stays alive, so let the browser handle them untouched.
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const href = e.currentTarget.href;
  e.preventDefault();
  window.setTimeout(() => window.location.assign(href), TRACK_DELAY_MS);
}

/**
 * The App Store button, in the header (compact pill), hero and closing CTA
 * (badge). Two states, decided at build time by NEXT_PUBLIC_APP_STORE_URL:
 *
 * - set: a real link to the listing, tracked as `app_store_click` with its
 *   placement.
 * - unset (app still in review): the same button reading "Coming soon on the
 *   App Store". It leads to the waitlist instead: the hero/closing badge
 *   focuses the email field right below it, and the header pill scrolls to
 *   and focuses the hero's.
 *
 * The hero always carries the waitlist line beneath the button (in the live
 * state it's for people who can't install yet); the closing CTA only adds it
 * before launch.
 */
export default function DownloadCta({ placement }: { placement: Placement }) {
  const live = APP_STORE_URL !== null;
  const label = live ? "Download on the App Store" : "Coming soon on the App Store";
  // Pre-launch the control's action is the waitlist, so its accessible name
  // says so (visible label first, per label-in-name).
  const preLaunchName = "Coming soon on the App Store: get the launch email";

  if (placement === "header") {
    const content = (
      <>
        <AppleLogo width={13} height={16} />
        <span className="rr-only-wide">{label}</span>
        <span className="rr-only-narrow">{live ? "App Store" : "Coming soon"}</span>
      </>
    );
    return live ? (
      <a
        href={APP_STORE_URL ?? undefined}
        aria-label={label}
        className="rr-cta-compact"
        onClick={(e) => onAppStoreClick(e, placement)}
      >
        {content}
      </a>
    ) : (
      <a
        href={`#${waitlistInputId("hero")}`}
        aria-label={preLaunchName}
        className="rr-cta-compact"
        onClick={(e) => {
          e.preventDefault();
          focusWaitlist("hero", { scroll: true });
        }}
      >
        {content}
      </a>
    );
  }

  const badgeContent = (
    <>
      <AppleLogo width={20} height={24} />
      <span className="rr-cta-badge-text">
        <span className="rr-cta-badge-small">
          {live ? "Download on the" : "Coming soon on the"}
        </span>
        <span className="rr-cta-badge-large">App Store</span>
      </span>
    </>
  );

  const badge = live ? (
    <a
      href={APP_STORE_URL ?? undefined}
      aria-label={label}
      className="rr-cta-badge"
      onClick={(e) => onAppStoreClick(e, placement)}
    >
      {badgeContent}
    </a>
  ) : (
    <button
      type="button"
      aria-label={preLaunchName}
      className="rr-cta-badge"
      onClick={() => focusWaitlist(placement)}
    >
      {badgeContent}
    </button>
  );

  const showWaitlist = placement === "hero" || !live;

  return (
    <>
      <div className="rr-cta-slot">{badge}</div>
      {showWaitlist && <WaitlistForm instance={placement} />}
    </>
  );
}
