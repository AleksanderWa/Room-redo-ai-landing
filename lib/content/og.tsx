import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";

// 1200x630 share cards. Satori rules: every div is display:flex, flexbox
// only, hex colours only, fonts as ArrayBuffers (woff/ttf/otf, not woff2),
// images with explicit width and height.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const CREAM = "#f7f2ea";
const INK = "#2c2824";
const SAND = "#e7dfd4";

const root = process.cwd();

const fonts = Promise.all([
  fs.readFile(path.join(root, "assets/fonts/cormorant-garamond-latin-600-normal.woff")),
  fs.readFile(path.join(root, "assets/fonts/dm-sans-latin-600-normal.woff")),
]);

async function dataUri(file: string, resize?: { width: number; height: number }) {
  const buf = await fs.readFile(file);
  if (!resize) return `data:image/png;base64,${buf.toString("base64")}`;
  const jpeg = await sharp(buf).resize(resize.width, resize.height, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

/** Title font size by length, so up to four lines fit the 680px column. */
function titleSize(title: string): number {
  if (title.length <= 40) return 76;
  if (title.length <= 60) return 66;
  return 58;
}

/**
 * The share card. With a hero it sits behind a left-to-right scrim (text in
 * the left 700px, everything inside a 64px safe margin); without one it is
 * sand with ink text. Only real app generations may be passed as `hero`.
 */
export async function ogCard({
  title,
  heroSrc,
  withBadges = true,
}: {
  title: string;
  heroSrc?: string;
  withBadges?: boolean;
}) {
  const [serif, sans] = await fonts;
  const icon = await dataUri(path.join(root, "public/images/brand-icon.png"));
  const hero = heroSrc ? await dataUri(path.join(root, "public", heroSrc), OG_SIZE) : null;
  const text = hero ? CREAM : INK;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          position: "relative",
          display: "flex",
          background: SAND,
        }}
      >
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            width={1200}
            height={630}
            alt=""
            style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        )}
        {hero && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              display: "flex",
              backgroundImage:
                "linear-gradient(90deg, rgba(20,16,12,0.78) 0%, rgba(20,16,12,0.6) 50%, rgba(20,16,12,0) 100%)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            left: 64,
            top: 64,
            bottom: 64,
            width: 680,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: text,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon} width={44} height={44} alt="" style={{ borderRadius: 10 }} />
            <div
              style={{
                display: "flex",
                fontFamily: "Cormorant",
                fontSize: 28,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Room Redo
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Cormorant",
              fontSize: titleSize(title),
              lineHeight: 1.1,
              letterSpacing: "-0.005em",
              // Four lines at most; the padding keeps descenders from being clipped.
              maxHeight: Math.round(4 * titleSize(title) * 1.1) + 12,
              paddingBottom: 12,
              overflow: "hidden",
              textShadow: hero ? "0 1px 12px rgba(20,16,12,0.5)" : "none",
            }}
          >
            {title}
          </div>
          {withBadges ? (
            <div style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: "DM Sans" }}>
              <div
                style={{
                  display: "flex",
                  background: hero ? CREAM : INK,
                  color: hero ? INK : CREAM,
                  fontSize: 20,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "8px 16px",
                  borderRadius: 100,
                }}
              >
                AI redesign
              </div>
              <div style={{ display: "flex", fontSize: 24 }}>First redesign free · iPhone</div>
            </div>
          ) : (
            <div style={{ display: "flex", fontFamily: "DM Sans", fontSize: 24 }}>First redesign free · iPhone</div>
          )}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Cormorant", data: serif, style: "normal", weight: 600 },
        { name: "DM Sans", data: sans, style: "normal", weight: 600 },
      ],
    },
  );
}
