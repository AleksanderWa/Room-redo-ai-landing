// All 47 live styles, mirroring the app's catalogue
// (Room-redo-app: src/constants/seriousSections.ts for the four serious
// sections and their labels, src/constants/styles.ts::WILD_STYLES for the
// 27 wild ones). Display names are copied from there verbatim; keep the two
// in lockstep by hand when the app adds a style.
//
// Thumbs are the app's 480x642 card thumbnails (every one is the same
// cluttered bedroom, redesigned), copied in by scripts/copy-assets.sh.
//
// Order matters: the style wall's "All" view shows the first 24 (desktop) or
// 12 (mobile) in this order. The four wild styles that lead the wild list
// are the ones the approved mockup shows in the first 24; the rest follow
// the app's own category order.

export type StyleSection =
  | "Calm & Minimal"
  | "Warm & Natural"
  | "Classic & Period"
  | "Bold & Statement"
  | "Wild";

export const STYLE_SECTIONS: StyleSection[] = [
  "Calm & Minimal",
  "Warm & Natural",
  "Classic & Period",
  "Bold & Statement",
  "Wild",
];

export type Style = {
  id: string;
  name: string;
  section: StyleSection;
  thumb: string;
};

const s = (id: string, name: string, section: StyleSection): Style => ({
  id,
  name,
  section,
  thumb: `/images/styles/${id}.jpg`,
});

export const styles: Style[] = [
  s("japandi", "Japandi", "Calm & Minimal"),
  s("scandinavian", "Scandinavian", "Calm & Minimal"),
  s("modern_minimalist", "Modern Minimalist", "Calm & Minimal"),
  s("organic_modern", "Organic Modern", "Calm & Minimal"),
  s("coastal", "Coastal", "Calm & Minimal"),

  s("farmhouse", "Farmhouse", "Warm & Natural"),
  s("rustic_cabin", "Rustic Cabin", "Warm & Natural"),
  s("casual_comfort", "Casual Comfort", "Warm & Natural"),
  s("bohemian", "Bohemian", "Warm & Natural"),
  s("mediterranean", "Mediterranean", "Warm & Natural"),
  s("tropical_resort", "Tropical Resort", "Warm & Natural"),

  s("timeless_classic", "Timeless Classic", "Classic & Period"),
  s("soft_parisian", "Soft Parisian", "Classic & Period"),
  s("english_country", "English Country", "Classic & Period"),
  s("transitional", "Transitional", "Classic & Period"),

  s("dark_luxury", "Dark Luxury", "Bold & Statement"),
  s("art_deco", "Art Deco", "Bold & Statement"),
  s("industrial", "Industrial", "Bold & Statement"),
  s("mid_century_modern", "Mid-Century Modern", "Bold & Statement"),
  s("seventies_retro", "1970s Retro", "Bold & Statement"),

  // Wild: mockup's first-24 picks first, then the app's category order.
  s("library_nook", "Library Nook", "Wild"),
  s("urban_jungle_corner", "Urban Jungle Corner", "Wild"),
  s("indoor_zen_garden", "Indoor Zen Garden", "Wild"),
  s("window_seat_reading_corner", "Window Seat Reading Corner", "Wild"),
  s("neutral_jacuzzi_spa", "Neutral Jacuzzi Spa", "Wild"),
  s("blush_jacuzzi_spa", "Blush Jacuzzi Spa", "Wild"),
  s("spa_bath", "Spa Bath", "Wild"),
  s("sauna_corner", "Sauna Corner", "Wild"),
  s("cold_plunge_nook", "Cold Plunge Nook", "Wild"),
  s("massage_room", "Massage Room", "Wild"),
  s("cozy_cat_lounge", "Cozy Cat Lounge", "Wild"),
  s("cat_playground_nook", "Cat Playground Nook", "Wild"),
  s("cat_lady_reading_nook", "Cat Lady Reading Nook", "Wild"),
  s("vanity_cat_corner", "Vanity + Cat Corner", "Wild"),
  s("dog_den", "Dog Den", "Wild"),
  s("vinyl_listening_lounge", "Vinyl Listening Lounge", "Wild"),
  s("whiskey_cigar_den", "Whiskey & Cigar Den", "Wild"),
  s("art_studio_corner", "Art Studio Corner", "Wild"),
  s("craft_hobby_room", "Craft & Hobby Room", "Wild"),
  s("cozy_lounge_nook", "Cozy Lounge Nook", "Wild"),
  s("hammock_lounge", "Hammock Lounge", "Wild"),
  s("meditation_pod", "Meditation Pod", "Wild"),
  s("home_yoga_studio", "Home Yoga Studio", "Wild"),
  s("sculptural_gallery_wall", "Sculptural Gallery Wall", "Wild"),
  s("aquarium_wall", "Aquarium Wall", "Wild"),
  s("coffee_matcha_bar", "Coffee & Matcha Bar", "Wild"),
  s("wine_cellar_nook", "Wine Cellar Nook", "Wild"),
];

/** Alt text in the mockup's phrasing: "in Japandi" for the serious styles,
 * "as a Library Nook" for the wild concepts. */
export function styleAlt(style: Style): string {
  if (style.section !== "Wild") return `Bedroom redesigned in ${style.name}`;
  const article = /^[AEIOU]/.test(style.name) ? "an" : "a";
  return `Bedroom redesigned as ${article} ${style.name}`;
}
