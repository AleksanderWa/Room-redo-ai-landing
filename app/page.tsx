import Image from "next/image";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import StyleCarousel from "@/components/StyleCarousel";
import WaitlistForm from "@/components/WaitlistForm";
import { styles } from "@/data/styles";
import { steps } from "@/data/steps";

const CORMORANT = "var(--font-cormorant), 'Cormorant Garamond', serif";

export default function Home() {
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
        className="rr-shell"
        style={{
          background: "#F7F2EA",
          color: "#2C2824",
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* WORDMARK */}
        <div style={{ textAlign: "center", padding: "14px 0 6px" }}>
          <span
            style={{
              fontFamily: CORMORANT,
              fontSize: 19,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#4A423A",
            }}
          >
            Room&nbsp;Redo
          </span>
        </div>

        {/* HERO SLIDER */}
        <BeforeAfterSlider
          beforeSrc="/images/hero-before.jpg"
          afterSrc="/images/hero-after.jpg"
          beforeAlt="Room before"
          afterAlt="Room after redesign"
          heightVariant="hero"
          showHint
          priority
        />

        {/* HERO COPY + FORM */}
        <div className="rr-content" style={{ padding: "22px 24px 26px" }}>
          <h1
            className="rr-hero-heading"
            style={{
              fontFamily: CORMORANT,
              fontWeight: 600,
              lineHeight: 1.02,
              letterSpacing: "-0.01em",
              margin: "0 0 10px",
            }}
          >
            See it before you touch a thing.
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.45,
              color: "#6C645A",
              margin: "0 0 18px",
            }}
          >
            Room Redo redesigns your room from a single photo. Snap it, pick
            a style, watch it transform.
          </p>

          <WaitlistForm instance="hero" />
        </div>

        {/* STYLES */}
        <div style={{ padding: "8px 0 30px" }}>
          <div className="rr-content" style={{ padding: "0 24px 14px" }}>
            <h2
              className="rr-section-heading"
              style={{
                fontFamily: CORMORANT,
                fontWeight: 600,
                lineHeight: 1.05,
                margin: "0 0 4px",
              }}
            >
              One room, six ways.
            </h2>
            <p style={{ fontSize: 14, color: "#6C645A", margin: 0 }}>
              Swipe through the styles from the videos.
            </p>
          </div>
          <StyleCarousel styles={styles} />
        </div>

        {/* HOW IT WORKS */}
        <div className="rr-content" style={{ padding: "6px 24px 30px" }}>
          <h2
            className="rr-section-heading"
            style={{
              fontFamily: CORMORANT,
              fontWeight: 600,
              lineHeight: 1.05,
              margin: "0 0 18px",
            }}
          >
            How it works
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {steps.map((st) => (
              <div
                key={st.num}
                style={{ display: "flex", alignItems: "center", gap: 16 }}
              >
                <div
                  style={{
                    position: "relative",
                    flex: "0 0 96px",
                    height: 96,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "#e5ddd2",
                  }}
                >
                  <Image
                    src={st.img}
                    alt=""
                    fill
                    loading="lazy"
                    sizes="96px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontFamily: CORMORANT,
                      fontSize: 15,
                      color: "#B47A57",
                    }}
                  >
                    {st.num}
                  </span>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 17,
                      lineHeight: 1.3,
                      color: "#2C2824",
                    }}
                  >
                    {st.line}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECOND BEFORE/AFTER */}
        <div className="rr-content" style={{ padding: "6px 24px 30px" }}>
          <h2
            className="rr-section-heading"
            style={{
              fontFamily: CORMORANT,
              fontWeight: 600,
              lineHeight: 1.05,
              margin: "0 0 4px",
            }}
          >
            Even the mess disappears.
          </h2>
          <p style={{ fontSize: 14, color: "#6C645A", margin: "0 0 16px" }}>
            Drag to see a cluttered corner become calm.
          </p>
          <BeforeAfterSlider
            beforeSrc="/images/storage-before.jpg"
            afterSrc="/images/storage-after.jpg"
            beforeAlt="Corner before"
            afterAlt="Corner after"
            heightVariant="storage"
            priority
          />
        </div>

        {/* CLOSING CTA */}
        <div
          style={{
            padding: "14px 24px 46px",
            background: "#EFE7DB",
            borderTop: "1px solid rgba(44,40,36,0.08)",
          }}
        >
          <div className="rr-content" style={{ paddingTop: 20 }}>
            <h2
              className="rr-closing-heading"
              style={{
                fontFamily: CORMORANT,
                fontWeight: 600,
                lineHeight: 1.04,
                margin: "0 0 8px",
                textAlign: "center",
              }}
            >
              Your room is one photo away.
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.45,
                color: "#6C645A",
                margin: "0 0 18px",
                textAlign: "center",
              }}
            >
              Join the waitlist and be first in when Room Redo opens on iOS.
            </p>

            <WaitlistForm instance="close" />

            <div style={{ textAlign: "center", marginTop: 22 }}>
              <a
                href="https://www.tiktok.com/@roomredoai"
                target="_blank"
                rel="noopener"
                style={{
                  fontSize: 13,
                  color: "#9A9186",
                  letterSpacing: "0.02em",
                }}
              >
                Not ready? Follow @roomredoai on TikTok →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
