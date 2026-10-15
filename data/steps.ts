// "How it works": one room, start to finish. Step 1 is the hero's before;
// step 2 is the Japandi card from the style wall; step 3 is the reveal, a
// half-before/half-after split of the hero pair (step-reveal.jpg, built by
// scripts/make-hero-crops.mjs).
import { styles } from "@/data/styles";

export type Step = {
  num: string;
  line: string;
  img: string;
  alt: string;
};

export const steps: Step[] = [
  {
    num: "01",
    line: "Snap one photo of your room.",
    img: "/images/hero-before.jpg",
    alt: "A bedroom photo, as taken",
  },
  {
    num: "02",
    line: `Pick from ${styles.length} styles.`,
    img: "/images/styles/japandi.jpg",
    alt: "The Japandi style",
  },
  {
    num: "03",
    line: "Watch it develop, like a print.",
    img: "/images/step-reveal.jpg",
    alt: "The bedroom, half before and half after",
  },
];
