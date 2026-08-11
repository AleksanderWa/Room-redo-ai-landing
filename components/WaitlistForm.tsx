"use client";

import { useState, type FormEvent } from "react";
import { isValidEmail, normalizeEmail } from "@/lib/validators";
import { useAttribution } from "@/components/AttributionProvider";

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

function doneBody(status: Status) {
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
  instance: "hero" | "close";
};

export default function WaitlistForm({ instance }: Props) {
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

  if (done) {
    const title = doneTitle(status);
    const body = doneBody(status);
    return (
      <div
        style={{
          border: "1px solid rgba(44,40,36,0.14)",
          background: "#FBF8F3",
          borderRadius: 14,
          padding: 20,
          textAlign: instance === "close" ? "center" : undefined,
        }}
      >
        {instance === "close" ? (
          <h3
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: 26,
              lineHeight: 1.1,
              margin: "0 0 8px",
            }}
          >
            {title}
          </h3>
        ) : (
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: 26,
              lineHeight: 1.1,
              margin: "0 0 8px",
            }}
          >
            {title}
          </h2>
        )}
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: "#6C645A",
            margin: "0 0 16px",
          }}
        >
          {body}
        </p>
        <a
          href="https://www.tiktok.com/@roomredoai"
          target="_blank"
          rel="noopener"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 48,
            borderRadius: 12,
            background: "#2F2A24",
            color: "#F7F2EA",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Follow for the launch date
        </a>
      </div>
    );
  }

  if (!formOpen) return null;

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
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

      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          width: "100%",
          height: 52,
          border: "1px solid rgba(44,40,36,0.18)",
          background: "#fff",
          borderRadius: 12,
          padding: "0 16px",
          fontSize: 16,
          color: "#2C2824",
        }}
      />
      <button
        type="submit"
        style={{
          width: "100%",
          height: 52,
          border: "none",
          borderRadius: 12,
          background: "#2F2A24",
          color: "#F7F2EA",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: instance === "hero" ? "0.01em" : undefined,
          cursor: "pointer",
        }}
      >
        Grab your free spot
      </button>
      {status === "error" && (
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#a5522f" }}>
          {errorText}
        </p>
      )}
      <p
        style={{
          margin: "4px 0 0",
          textAlign: "center",
          fontSize: 12,
          letterSpacing: instance === "hero" ? "0.02em" : undefined,
          color: "#9A9186",
        }}
      >
        iOS · Launching soon · No spam, ever.
      </p>
    </form>
  );
}
