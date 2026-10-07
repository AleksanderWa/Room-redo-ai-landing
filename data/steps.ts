// "How it works": one room, start to finish. Steps 1 and 3 are the same room
// as the hero slider (before/after); step 2 is the Japandi card from the
// style wall.
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
    line: "Pick from 47 styles.",
    img: "/images/styles/japandi.jpg",
    alt: "The Japandi style",
  },
  {
    num: "03",
    line: "Watch it develop, like a print.",
    img: "/images/hero-after.jpg",
    alt: "The same bedroom, redesigned",
  },
];
