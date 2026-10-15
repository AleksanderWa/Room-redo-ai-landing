"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { isValidEmail, normalizeEmail } from "@/lib/validators";
import { useAttribution } from "@/components/AttributionProvider";
import { APP_STORE_URL, TIKTOK_URL } from "@/lib/site";
import {
  focusWaitlist,
  waitlistInputId,
  waitlistStatusId,
  type WaitlistInstance,
} from "@/lib/waitlistFocus";

type Status = "idle" | "pending" | "error" | "success" | "dup";

/** Outcome of the request, held until the leave animation finishes. */
type Outcome = "success" | "dup";

// Timings (ms); the CSS in globals.css (Waitlist) uses the same values.
/** Minimum time the "Saving" state shows, so a fast response still reads. */
const MIN_PENDING_MS = 350;
/** Form fade/lift out before the card replaces it. */
const LEAVE_MS = 180;
/** Wrapper height morph (form -> card); the height is released after it. */
const MORPH_MS = 320;

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
  // Form is fading out; the card replaces it once LEAVE_MS has passed.
  const [leaving, setLeaving] = useState(false);
  // Bumped on each error to replay the input shake.
  const [shake, setShake] = useState(0);
  // Button width locked while its label is "Saving", so it doesn't jump.
  const [buttonMinWidth, setButtonMinWidth] = useState<number | undefined>();
  // Explicit height of the wrapper while the form morphs into the card.
  const [height, setHeight] = useState<number | undefined>();
  const source = useAttribution();

  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pending = status === "pending";
  const formOpen = status === "idle" || status === "error" || pending;
  const done = status === "success" || status === "dup";

  // Card just mounted: animate the wrapper from the form's height (locked in
  // finish()) to the card's, then release it; move focus to the title.
  useLayoutEffect(() => {
    if (!done || !cardRef.current) return;
    setHeight(cardRef.current.offsetHeight);
    const release = setTimeout(() => setHeight(undefined), MORPH_MS + 40);

    const title = titleRef.current;
    if (title) {
      title.focus({ preventScroll: true });
      const r = title.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        title.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      }
    }
    return () => clearTimeout(release);
  }, [done]);

  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  // Success (200 or 409): fade the form out, then swap in the card.
  function finish(outcome: Outcome) {
    if (wrapRef.current) setHeight(wrapRef.current.offsetHeight);
    setLeaving(true);
    later(() => {
      setLeaving(false);
      setStatus(outcome);
    }, LEAVE_MS);
  }

  function fail(text: string) {
    setErrorText(text);
    setStatus("error");
    setButtonMinWidth(undefined);
    setShake((n) => n + 1);
    // The button was disabled while pending, which drops focus; hand it
    // back to the field the error is about.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || leaving) return;
    const normalized = normalizeEmail(email);

    if (!isValidEmail(normalized)) {
      setErrorText(ERROR_TEXT);
      setStatus("error");
      setShake((n) => n + 1);
      // The shake remounts the input (see key); keep the caret in it.
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    setButtonMinWidth(buttonRef.current?.getBoundingClientRect().width);
    setStatus("pending");
    const started = Date.now();
    const settle = async () => {
      const wait = MIN_PENDING_MS - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    };

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, source, company }),
      });

      if (res.status === 200) {
        const body = (await res.json()) as { status?: string };
        await settle();
        finish(body.status === "dup" ? "dup" : "success");
        return;
      }
      await settle();
      if (res.status === 409) {
        finish("dup");
        return;
      }
      fail(res.status === 400 ? ERROR_TEXT : NETWORK_ERROR_TEXT);
    } catch {
      await settle();
      fail(NETWORK_ERROR_TEXT);
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
    <div
      ref={wrapRef}
      className="rr-waitlist-wrap"
      style={height !== undefined ? { height, overflow: "hidden" } : undefined}
    >
      {formOpen && (
        <div className={`rr-waitlist${leaving ? " rr-waitlist--leaving" : ""}`}>
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
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rr-waitlist-form"
            aria-busy={pending || leaving}
          >
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
              disabled={pending || leaving}
              ref={inputRef}
              // Remounted per error so the shake animation replays.
              key={shake}
              className={`rr-waitlist-input${shake > 0 && status === "error" ? " rr-waitlist-input--shake" : ""}`}
            />
            <button
              type="submit"
              ref={buttonRef}
              disabled={pending || leaving}
              className="rr-waitlist-button"
              style={buttonMinWidth ? { minWidth: buttonMinWidth } : undefined}
            >
              {pending || leaving ? (
                <span className="rr-waitlist-saving">
                  Saving
                  <span className="rr-waitlist-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </span>
              ) : (
                "Grab your free spot"
              )}
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
            ref={cardRef}
            className="rr-waitlist-card"
            style={{
              border: "1px solid var(--rr-line)",
              background: "var(--rr-cream)",
              borderRadius: 14,
              padding: 20,
              textAlign: instance === "close" ? "center" : undefined,
            }}
          >
            <span className="rr-waitlist-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                />
              </svg>
            </span>
            <Heading
              ref={titleRef}
              tabIndex={-1}
              className="rr-waitlist-card-item"
              style={{
                fontFamily: "var(--rr-serif)",
                fontWeight: 600,
                fontSize: 26,
                lineHeight: 1.1,
                margin: "0 0 8px",
                outline: "none",
              }}
            >
              {doneTitle(status)}
            </Heading>
            <p
              className="rr-waitlist-card-item"
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
              className="rr-waitlist-card-item"
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
