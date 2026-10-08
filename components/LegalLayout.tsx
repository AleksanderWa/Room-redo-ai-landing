import Link from "next/link";
import type { ReactNode } from "react";
import Brand from "@/components/Brand";

/** Shared shell for /privacy and /terms: the homepage's brand mark, palette
 * and type, in a plain readable reading column for long-form text. */
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
        background: "var(--rr-sand)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "var(--rr-cream)",
          color: "var(--rr-ink)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "28px 0 6px" }}>
          <Brand />
        </div>

        <div style={{ padding: "20px 24px 72px" }}>
          <h1
            style={{
              fontFamily: "var(--rr-serif)",
              fontWeight: 600,
              fontSize: 36,
              lineHeight: 1.08,
              margin: "16px 0 6px",
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 13, color: "var(--rr-soft)", margin: "0 0 34px" }}>
            Effective {effectiveDate}
          </p>

          <div className="rr-legal-body">{children}</div>

          <div style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid var(--rr-line)" }}>
            <Link href="/" style={{ fontSize: 13, color: "var(--rr-soft)", letterSpacing: "0.02em" }}>
              ← Back to Room Redo AI
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
