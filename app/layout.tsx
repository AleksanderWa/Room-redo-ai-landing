import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AttributionProvider } from "@/components/AttributionProvider";
import { DESCRIPTION } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Room Redo AI — See it before you touch a thing.",
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Room Redo AI",
    title: "Room Redo AI — See it before you touch a thing.",
    description: DESCRIPTION,
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
    description: DESCRIPTION,
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
