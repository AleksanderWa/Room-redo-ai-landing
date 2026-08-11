import { ImageResponse } from "next/og";

// Placeholder favicon: the source design has no logo, only a text wordmark
// ("Room Redo"). This is a simple monogram in the site's palette, meant to
// be swapped for a real mark if/when one exists.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2F2A24",
          color: "#F7F2EA",
          fontFamily: "serif",
          fontSize: 22,
          fontWeight: 600,
        }}
      >
        R
      </div>
    ),
    { ...size }
  );
}
