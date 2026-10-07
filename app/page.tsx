import Image from "next/image";
import Link from "next/link";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import DownloadCta from "@/components/DownloadCta";
import StyleWall from "@/components/StyleWall";
import { faqs, FAQ_SPLIT, type Faq } from "@/data/faq";
import { steps } from "@/data/steps";
import { styles } from "@/data/styles";
import { homeJsonLd } from "@/lib/seo";
import { SUPPORT_EMAIL, TIKTOK_URL } from "@/lib/site";

// Section order, copy and sizes follow the approved mockups (Main.dc.html at
// 1440px, Mobile.dc.html at 390px). Responsive values live in globals.css.

const STYLE_COUNT = styles.length;
const WILD_COUNT = styles.filter((s) => s.section === "Wild").length;

const WILD_PICKS = [
  { id: "cozy_cat_lounge", name: "Cozy Cat Lounge", alt: "Bedroom redesigned as a cat lounge" },
  { id: "neutral_jacuzzi_spa", name: "Neutral Jacuzzi Spa", alt: "Bedroom redesigned with a jacuzzi spa" },
  { id: "vinyl_listening_lounge", name: "Vinyl Listening Lounge", alt: "Bedroom redesigned as a vinyl listening lounge" },
  { id: "wine_cellar_nook", name: "Wine Cellar Nook", alt: "Bedroom redesigned as a wine cellar nook" },
  { id: "aquarium_wall", name: "Aquarium Wall", alt: "Bedroom redesigned with an aquarium wall" },
];

const CORNER_DESTINATIONS = [
  { img: "/images/corner/dest-library.jpg", title: "A reading nook", alt: "A corner redesigned as a reading nook" },
  { img: "/images/corner/dest-wine.jpg", title: "A wine corner", alt: "A corner redesigned as a wine corner" },
  { img: "/images/corner/dest-meditation.jpg", title: "A meditation spot", alt: "A corner redesigned as a meditation spot" },
];

function Brand() {
  return (
    <Link href="/" aria-label="Room Redo home" className="rr-brand">
      <Image
        src="/images/brand-icon.png"
        alt=""
        width={28}
        height={28}
        className="rr-brand-icon"
      />
      <span className="rr-brand-word">Room Redo</span>
    </Link>
  );
}

function FaqItem({ faq, open }: { faq: Faq; open?: boolean }) {
  return (
    <details className="rr-faq-item" open={open}>
      <summary className="rr-faq-q">
        <span>{faq.q}</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--rr-ink)"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path className="rr-faq-plus-v" d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </summary>
      <p className="rr-faq-a">{faq.a}</p>
    </details>
  );
}

export default function Home() {
  return (
    <>
      {/* Structured data, per the Next 16 JSON-LD guide: a plain script tag
          with `<` escaped. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* 1. Header */}
      <header style={{ borderBottom: "1px solid var(--rr-line)" }}>
        <div className="rr-wrap rr-header-bar">
          <Brand />
          <DownloadCta placement="header" />
        </div>
      </header>

      <main>
        {/* 2. Hero + proof strip */}
        <section className="rr-hero">
          <div className="rr-wrap">
            <div className="rr-hero-grid">
              <div className="rr-hero-copy">
                <h1 className="rr-display rr-hero-h1">
                  <span>The room you have.</span>
                  <span>And the one you keep saving.</span>
                </h1>
                <p className="rr-hero-sub">
                  Snap one photo. Pick a style. Watch your own room change.
                </p>
                <DownloadCta placement="hero" />
              </div>

              <div className="rr-hero-phone-col">
                <BeforeAfterSlider
                  beforeSrc="/images/hero-before.jpg"
                  afterSrc="/images/hero-after.jpg"
                  beforeAlt="A cluttered bedroom, before"
                  afterAlt="The same bedroom, redesigned"
                  heightVariant="hero"
                  eager
                />
              </div>
            </div>

            <ul className="rr-proof">
              <li>{STYLE_COUNT} styles</li>
              <li aria-hidden="true" className="rr-proof-dot">·</li>
              <li>One photo</li>
              <li aria-hidden="true" className="rr-proof-dot">·</li>
              <li>First redesign free</li>
              <li aria-hidden="true" className="rr-proof-dot">·</li>
              <li>No account</li>
            </ul>
          </div>
        </section>

        {/* 3. Tension */}
        <section>
          <div className="rr-wrap rr-tension rr-reveal">
            <h2 className="rr-display rr-tension-h2">
              <span>You&apos;ve saved 400 rooms on Pinterest.</span>
              <span>None of them are yours.</span>
            </h2>
            <p className="rr-tension-sub">So start with the one you live in.</p>
          </div>
        </section>

        {/* 4. Style wall */}
        <section style={{ background: "var(--rr-cream)" }}>
          <div className="rr-wrap rr-section rr-reveal">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 20,
              }}
            >
              <h2 className="rr-display rr-h2">
                <span>One bedroom.</span>
                <span>{STYLE_COUNT} ways.</span>
              </h2>
              <p className="rr-lede" style={{ color: "var(--rr-soft)", maxWidth: 560 }}>
                Every style below is the same messy bedroom, redesigned. Yours will be too.
              </p>
            </div>
            <StyleWall />
          </div>
        </section>

        {/* 5. Wild styles */}
        <section style={{ background: "var(--rr-ink)", color: "var(--rr-cream)" }}>
          <div className="rr-wrap rr-section rr-reveal">
            <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
              <h2 className="rr-display rr-h2">
                <span>Or an idea</span>
                <span>you&apos;d never have had.</span>
              </h2>
              <p className="rr-lede" style={{ opacity: 0.78 }}>
                {WILD_COUNT} wild styles, from a cat lounge to a jacuzzi in the spare room.
              </p>
            </div>
            <div className="rr-wild-grid">
              {WILD_PICKS.map((w) => (
                <figure key={w.id} className="rr-wild-fig">
                  <Image
                    src={`/images/styles/${w.id}.jpg`}
                    alt={w.alt}
                    fill
                    sizes="(min-width: 1100px) 210px, (min-width: 700px) 50vw, 100vw"
                    style={{ objectFit: "cover" }}
                  />
                  <figcaption className="rr-wild-caption">{w.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Corners */}
        <section>
          <div className="rr-wrap rr-section rr-reveal">
            <div className="rr-corners">
              <div className="rr-corners-head">
                <h2 className="rr-display rr-h2">
                  <span>That corner</span>
                  <span>you step over every day.</span>
                </h2>
                <p className="rr-lede" style={{ color: "var(--rr-soft-on-sand)", maxWidth: 460 }}>
                  Point the camera at one messy spot, tell us what it&apos;s for, and see it sorted.
                </p>
              </div>

              <div className="rr-corners-media">
                <BeforeAfterSlider
                  beforeSrc="/images/corner/understairs-before.jpg"
                  afterSrc="/images/corner/understairs-after.jpg"
                  beforeAlt="The cluttered space under the stairs, before"
                  afterAlt="The same space under the stairs, made usable"
                  heightVariant="storage"
                  sizes="(min-width: 700px) 480px, 100vw"
                />
                <p className="rr-corners-caption">
                  Under the stairs: from dumping ground to{" "}
                  <span className="rr-corners-caption-em">actually usable.</span>
                </p>
              </div>

              <div className="rr-corners-tiles">
                {CORNER_DESTINATIONS.map((d) => (
                  <figure key={d.img} className="rr-corner-fig">
                    <div className="rr-corner-thumb">
                      <Image
                        src={d.img}
                        alt={d.alt}
                        fill
                        sizes="(min-width: 1100px) 170px, (min-width: 700px) 30vw, 31vw"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <figcaption style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span className="rr-corner-kicker">Becomes</span>
                      <span className="rr-corner-title">{d.title}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 7. How it works */}
        <section className="rr-rule-top">
          <div className="rr-wrap rr-section rr-reveal">
            <h2 className="rr-eyebrow">How it works</h2>
            <ol className="rr-steps">
              {steps.map((st) => (
                <li key={st.num} className="rr-step">
                  <div className="rr-step-head">
                    <span aria-hidden="true" className="rr-step-num">
                      {st.num}
                    </span>
                    <p className="rr-step-line">{st.line}</p>
                  </div>
                  <div className="rr-step-img">
                    <Image
                      src={st.img}
                      alt={st.alt}
                      fill
                      sizes="(min-width: 1100px) 340px, (min-width: 700px) 30vw, 100vw"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 8. Pricing teaser */}
        <section style={{ background: "var(--rr-cream)" }}>
          <div className="rr-wrap rr-pricing rr-reveal">
            <div aria-hidden="true" style={{ width: 40, height: 1, background: "var(--rr-brass)" }} />
            <p className="rr-display rr-pricing-line">
              <span>Your first redesign is free.</span>
              <span>Nothing to choose until you&apos;ve seen your own room.</span>
            </p>
            <p style={{ margin: 0, fontSize: 15, color: "var(--rr-soft)" }}>
              Then weekly or monthly plans, cancel any time.
            </p>
          </div>
        </section>

        {/* 9. FAQ */}
        <section>
          <div className="rr-wrap rr-section rr-reveal">
            <h2 className="rr-display rr-h2">
              <span>Questions,</span>
              <span>answered plainly.</span>
            </h2>
            <div className="rr-faq-cols">
              <div className="rr-faq-col">
                {faqs.slice(0, FAQ_SPLIT).map((f, i) => (
                  <FaqItem key={f.q} faq={f} open={i === 0} />
                ))}
              </div>
              <div className="rr-faq-col">
                {faqs.slice(FAQ_SPLIT).map((f) => (
                  <FaqItem key={f.q} faq={f} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 10. Closing CTA */}
        <section className="rr-rule-top">
          <div className="rr-wrap rr-close rr-reveal">
            <h2 className="rr-display rr-close-h2">
              <span>Your room is</span>
              <span>one photo away.</span>
            </h2>
            <DownloadCta placement="close" />
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener"
              style={{ fontSize: 15, fontWeight: 500, textDecoration: "underline" }}
            >
              Follow @roomredoai on TikTok →
            </a>
          </div>
        </section>
      </main>

      {/* 11. Footer */}
      <footer className="rr-rule-top">
        <div className="rr-wrap rr-footer">
          <div className="rr-footer-top">
            <Brand />
            <nav aria-label="Footer" className="rr-footer-nav">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <a href={`mailto:${SUPPORT_EMAIL}`}>Support · {SUPPORT_EMAIL}</a>
              <a href={TIKTOK_URL} target="_blank" rel="noopener">
                TikTok
              </a>
            </nav>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--rr-soft-on-sand)" }}>
            © 2026 Room Redo
          </p>
        </div>
      </footer>
    </>
  );
}
