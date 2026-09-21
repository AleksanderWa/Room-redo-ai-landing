import Link from "next/link";
import type { ReactNode } from "react";

const CORMORANT = "var(--font-cormorant), 'Cormorant Garamond', serif";

/** Shared shell for /privacy and /terms — same wordmark, palette, and type
 * as the marketing page (app/page.tsx), but a plain readable reading
 * column instead of the phone-simulated `.rr-shell`, since legal pages are
 * long-form text rather than a device mockup. */
export function LegalLayout({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        background: "#E7DFD4",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "#F7F2EA",
          color: "#2C2824",
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "28px 0 6px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <svg width="22" height="22" viewBox="0 0 100 100" fill="none" aria-hidden="true" style={{ display: "block" }}>
              <rect x="20" y="14" width="60" height="72" rx="15" fill="none" stroke="#2C2824" strokeWidth="6.5" />
              <line x1="50" y1="17" x2="50" y2="83" stroke="#2C2824" strokeWidth="4.5" />
              <circle cx="50" cy="50" r="9.5" fill="#8A5A3C" />
            </svg>
            <span
              style={{
                fontFamily: CORMORANT,
                fontSize: 19,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#2C2824",
              }}
            >
              Room&nbsp;Redo
            </span>
          </Link>
        </div>

        <div style={{ padding: "20px 24px 72px" }}>
          <h1
            style={{
              fontFamily: CORMORANT,
              fontWeight: 600,
              fontSize: 36,
              lineHeight: 1.08,
              margin: "16px 0 6px",
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 13, color: "#6C645A", margin: "0 0 34px" }}>Effective {effectiveDate}</p>

          <div className="rr-legal-body">{children}</div>

          <div style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid rgba(44,40,36,0.1)" }}>
            <Link href="/" style={{ fontSize: 13, color: "#9A9186", letterSpacing: "0.02em" }}>
              ← Back to Room Redo AI
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
