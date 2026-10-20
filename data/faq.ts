// Single source for the FAQ: rendered by app/page.tsx and serialized into
// the FAQPage JSON-LD built in lib/seo.ts, so the two can't drift apart.
//
// "How long does it take?": the approved mockup left this as a placeholder.
// The app has no user-facing duration claim to cite, so this is the
// non-committal answer until someone confirms a real typical time.
// `more` is an optional link line shown under the answer. It stays out of `a`
// so the FAQPage JSON-LD text is plain. The component appends the arrow.
export type Faq = {
  q: string;
  a: string;
  more?: { label: string; href: string };
};

export const faqs: Faq[] = [
  { q: "Do I need an account?", a: "No. Your device is enough." },
  {
    q: "What happens to my photos?",
    a: "They're stored so your rooms stay in My Spaces. You can delete everything from Settings in the app.",
  },
  {
    q: "Is the free redesign the full thing?",
    a: "Yes, the full redesign, with a small watermark until you subscribe.",
    more: { label: "More on what's free", href: "/guides/ai-room-design-free" },
  },
  {
    q: "Which rooms work?",
    a: "Bedrooms, living rooms, kitchens, bathrooms, offices, balconies, and single corners.",
  },
  {
    q: "How long does it take?",
    a: "A little while. The app shows the redesign developing as it happens.",
  },
  { q: "Is it on Android?", a: "iPhone only for now." },
  {
    q: "How do I cancel?",
    a: "In your iPhone's Settings, under Subscriptions. Cancel any time.",
  },
];

/** Desktop splits the list into two columns after this many items. */
export const FAQ_SPLIT = 4;
