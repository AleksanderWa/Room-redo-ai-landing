import { faqs } from "@/data/faq";
import { styles } from "@/data/styles";
import { APP_STORE_URL, SITE_URL } from "@/lib/site";

export const DESCRIPTION = `Room Redo redesigns your own room from a single photo, in ${styles.length} styles, from Japandi to a cat lounge. ${
  APP_STORE_URL
    ? "Download it on the App Store for iPhone."
    : "Coming soon on the App Store for iPhone."
}`;

// Homepage structured data. Rendered by app/page.tsx (not the root layout)
// so the FAQPage markup only appears on the page that shows those questions;
// the answers come from the same data/faq.ts the page renders.
export const homeJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Room Redo",
    operatingSystem: "iOS",
    applicationCategory: "LifestyleApplication",
    description: DESCRIPTION,
    url: APP_STORE_URL ?? SITE_URL,
    ...(APP_STORE_URL ? { downloadUrl: APP_STORE_URL } : {}),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];
