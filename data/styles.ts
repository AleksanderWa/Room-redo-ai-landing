// Ported verbatim from the source design's `styles` array.
export type StyleCard = {
  num: string;
  name: string;
  img: string;
};

export const styles: StyleCard[] = [
  { num: "01", name: "Japandi", img: "/images/style-japandi.jpg" },
  { num: "02", name: "Coastal", img: "/images/style-coastal.jpg" },
  { num: "03", name: "Scandinavian", img: "/images/style-scandinavian.jpg" },
  { num: "04", name: "Modern Farmhouse", img: "/images/style-farmhouse.jpg" },
  { num: "05", name: "Dark Luxury", img: "/images/style-darkluxury.jpg" },
  { num: "06", name: "Soft Parisian", img: "/images/style-softparisian.jpg" },
];
