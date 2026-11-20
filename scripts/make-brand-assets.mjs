// Builds the Nola Home brand assets from the real icon (1254x1254):
//   public/images/brand-lockup.png  masthead crop ("Nola" + "HOME"), 360x180
//   public/images/brand-icon.png    full icon, 256x256
//   app/icon.png                    full icon, 192x192 (favicon)
//   app/apple-icon.png              full icon, 180x180, opaque
// Downscale only (lanczos3); never upscale.
//
//   node scripts/make-brand-assets.mjs

import sharp from "sharp";

const SRC = "assets/brand/icon-source-1254.png";
const LOCKUP_CROP = { left: 80, top: 90, width: 1120, height: 560 };

const icon = (size) => sharp(SRC).resize(size, size, { kernel: "lanczos3" });

await sharp(SRC)
  .extract(LOCKUP_CROP)
  .resize(360, 180, { kernel: "lanczos3" })
  .png()
  .toFile("public/images/brand-lockup.png");
await icon(256).png().toFile("public/images/brand-icon.png");
await icon(192).png().toFile("app/icon.png");
// flatten/removeAlpha: the source is opaque today; kept so a future source
// with alpha still yields the opaque icon iOS requires.
await icon(180).flatten({ background: "#ffffff" }).removeAlpha().png().toFile("app/apple-icon.png");
console.log("wrote brand-lockup, brand-icon, icon, apple-icon");
