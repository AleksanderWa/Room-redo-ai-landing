"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import { isValidEmail, normalizeEmail } from "@/lib/validators";
import { useAttribution } from "@/components/AttributionProvider";
import { APP_STORE_URL, TIKTOK_URL } from "@/lib/site";
import {
  focusWaitlist,
  waitlistInputId,
  waitlistStatusId,
  type WaitlistInstance,
} from "@/lib/waitlistFocus";

type Status = "idle" | "error" | "success" | "dup";

// Copy ported verbatim from the source design's DCLogic (its own em dashes
// were mangled by an encoding round-trip in the export; restored here).
const ERROR_TEXT = "Hmm, that doesn't look like an email — mind checking?";
// Not present in the source (which was a synchronous localStorage mock and
// had no failure mode) — a necessary addition for a real network call,
// styled identically to the existing error paragraph.
const NETWORK_ERROR_TEXT = "Something went wrong — please try again.";

function doneTitle(status: Status) {
  return status === "dup" ? "You're already in." : "You're on the list.";
}

// Copy depends on whether the app is out yet (NEXT_PUBLIC_APP_STORE_URL,
// inlined at build time). Before launch the form is the waitlist for the
// launch itself; after it, it's for people who can't install it yet
// (other regions, no iPhone) and want news.
const LIVE = APP_STORE_URL !== null;

const LEAD = LIVE
  ? { text: "Not on iPhone yet?", link: "Get launch news →" }
  : { text: "Want to know the day it's live?", link: "Get the launch email →" };

const FOLLOW_LABEL = LIVE ? "Follow on TikTok" : "Follow for the launch date";

function doneBody(status: Status) {
  if (LIVE) {
    return status === "dup"
      ? "No need to sign up twice — your spot is saved. Follow along on TikTok for news."
      : "We'll email you with Room Redo news. For the latest first, follow along on TikTok.";
  }
  return status === "dup"
    ? "No need to sign up twice — your spot is saved. Follow along on TikTok for the launch date."
    : "We'll email you the moment Room Redo opens on iOS. For the launch date first, follow along on TikTok.";
}

const honeypotStyle = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

type Props = {
  instance: WaitlistInstance;
};

export default function WaitlistForm({ instance }: Props) {
  const inputId = waitlistInputId(instance);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState(ERROR_TEXT);
  const source = useAttribution();

  const formOpen = status === "idle" || status === "error";
  const done = status === "success" || status === "dup";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalized = normalizeEmail(email);

    if (!isValidEmail(normalized)) {
      setErrorText(ERROR_TEXT);
      setStatus("error");
      return;
    }

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, source, company }),
      });

      if (res.status === 200) {
        const body = (await res.json()) as { status?: string };
        setStatus(body.status === "dup" ? "dup" : "success");
        return;
      }
      if (res.status === 409) {
        setStatus("dup");
        return;
      }
      if (res.status === 400) {
        setErrorText(ERROR_TEXT);
        setStatus("error");
        return;
      }
      setErrorText(NETWORK_ERROR_TEXT);
      setStatus("error");
    } catch {
      setErrorText(NETWORK_ERROR_TEXT);
      setStatus("error");
    }
  }

  function handleChange(value: string) {
    setEmail(value);
    if (status === "error") setStatus("idle");
  }

  function focusInput(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    focusWaitlist(instance);
  }

  const Heading = instance === "close" ? "h3" : "h2";

  return (
    <div className="rr-waitlist-wrap">
      {formOpen && (
        <div className="rr-waitlist">
          <p style={{ margin: 0, fontSize: 14, color: "var(--rr-soft-on-sand)" }}>
            {LEAD.text}{" "}
            <a
              href={`#${inputId}`}
              onClick={focusInput}
              style={{ fontWeight: 500, textDecoration: "underline" }}
            >
              {LEAD.link}
            </a>
          </p>
          <form onSubmit={handleSubmit} noValidate className="rr-waitlist-form">
            <label style={honeypotStyle} aria-hidden="true">
              Company
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                name="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>

            <label htmlFor={inputId} className="rr-sr-only">
              Email address
            </label>
            <input
              id={inputId}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => handleChange(e.target.value)}
              aria-invalid={status === "error"}
              aria-describedby={status === "error" ? `${inputId}-error` : undefined}
              className="rr-waitlist-input"
            />
            <button type="submit" className="rr-waitlist-button">
              Grab your free spot
            </button>
          </form>
          {status === "error" && (
            <p
              id={`${inputId}-error`}
              role="alert"
              style={{ margin: 0, fontSize: 13, color: "#a5522f" }}
            >
              {errorText}
            </p>
          )}
        </div>
      )}

      {/* Rendered from the start (empty) so screen readers have already
          registered the live region when the confirmation lands in it. */}
      <div
        id={waitlistStatusId(instance)}
        role="status"
        aria-live="polite"
      >
        {done && (
          <div
            style={{
              border: "1px solid var(--rr-line)",
              background: "var(--rr-cream)",
              borderRadius: 14,
              padding: 20,
              textAlign: instance === "close" ? "center" : undefined,
            }}
          >
            <Heading
              style={{
                fontFamily: "var(--rr-serif)",
                fontWeight: 600,
                fontSize: 26,
                lineHeight: 1.1,
                margin: "0 0 8px",
              }}
            >
              {doneTitle(status)}
            </Heading>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "var(--rr-soft)",
                margin: "0 0 16px",
              }}
            >
              {doneBody(status)}
            </p>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 48,
                borderRadius: 12,
                background: "var(--rr-ink)",
                color: "var(--rr-cream)",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {FOLLOW_LABEL}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
