import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const authorSchema = z
  .object({
    name: z.string().min(1),
    role: z.string().min(1),
    // One line for the author box and structured data.
    summary: z.string().min(1),
    // Rendered on the author page only when present. No links until the
    // author supplies them.
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
  })
  .strict();

export type Author = z.output<typeof authorSchema> & { id: string; bio: string; path: string };

export function getAuthor(id: "aleksander"): Author {
  // Always the repo's own author files, even when CONTENT_DIR points elsewhere.
  const file = path.join(process.cwd(), "content", "authors", `${id}.md`);
  const parsed = matter(fs.readFileSync(file, "utf8"));
  const result = authorSchema.safeParse(parsed.data);
  if (!result.success) {
    throw new Error(`Invalid author file ${file}: ${result.error.message}`);
  }
  return { ...result.data, id, bio: parsed.content.trim(), path: `/about/${id}` };
}

/** Real photo if present, else null (the UI shows a monogram). */
export function authorPhoto(id: string): string | null {
  const rel = `/images/authors/${id}.jpg`;
  return fs.existsSync(path.join(process.cwd(), "public", rel)) ? rel : null;
}
