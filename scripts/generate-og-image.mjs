// Generates the static 1200x630 Open Graph image from storage-after.jpg.
// Run once after `bash scripts/copy-assets.sh`, and commit the result —
// this is deliberately a static, committed file rather than a dynamic
// next/og route: the image never changes per-request, so a dynamic route
// would only add a cold-start on the social-crawler fetch path for no
// benefit.
//
//   node scripts/generate-og-image.mjs

import sharp from "sharp";
import { existsSync } from "node:fs";

const SRC = "public/images/storage-after.jpg";
const DEST = "public/og.jpg";

if (!existsSync(SRC)) {
  console.error(
    `error: ${SRC} not found — run 'bash scripts/copy-assets.sh' first.`
  );
  process.exit(1);
}

await sharp(SRC)
  .resize(1200, 630, { fit: "cover" })
  .jpeg({ quality: 82 })
  .toFile(DEST);

console.log(`wrote ${DEST} (1200x630)`);
