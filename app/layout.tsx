import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AttributionProvider } from "@/components/AttributionProvider";
import "./globals.css";

// Self-hosted via next/font (replaces the source's render-blocking Google
// Fonts <link> tags) — no external request, directly helps first paint on
// cellular.
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const SITE_URL = "https://roomredoai.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Room Redo AI — See it before you touch a thing.",
  description:
    "Room Redo redesigns your room from a single photo. Snap it, pick a style, watch it transform. Join the waitlist for iOS.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Room Redo AI",
    title: "Room Redo AI — See it before you touch a thing.",
    description:
      "Room Redo redesigns your room from a single photo. Snap it, pick a style, watch it transform.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Room Redo AI — before and after room redesign",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Room Redo AI — See it before you touch a thing.",
    description:
      "Room Redo redesigns your room from a single photo. Snap it, pick a style, watch it transform.",
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorantGaramond.variable} ${dmSans.variable}`}>
      <body>
        <AttributionProvider>{children}</AttributionProvider>
        <Analytics />
      </body>
    </html>
  );
}
