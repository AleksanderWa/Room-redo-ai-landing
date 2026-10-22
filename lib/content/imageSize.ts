import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import type { ImageDims } from "@/lib/content/imageLayout";

const cache = new Map<string, ImageDims>();

/** Pixel size of a file under `public/`, read synchronously at build/render
 *  time. Throws when the file is missing or unreadable, so a bad path fails
 *  the build instead of shipping a frame with the wrong shape. */
export function readImageSize(src: string): ImageDims {
  const hit = cache.get(src);
  if (hit) return hit;
  const file = path.join(process.cwd(), "public", src);
  const { width, height } = imageSize(fs.readFileSync(file));
  if (!width || !height) throw new Error(`Cannot read the size of ${src}`);
  const dims = { width, height };
  cache.set(src, dims);
  return dims;
}
