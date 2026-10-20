/** Markdown title that marks a body image as a real, non-AI photo
 *  (`![A real kitchen](/images/x.webp "photo")`). Every other body image is
 *  treated as a Room Redo output and carries the AI redesign label. */
export const PHOTO_OPT_OUT_TITLE = "photo";

export function splitImageTitle(title?: string): { isPhoto: boolean; caption?: string } {
  const t = title?.trim();
  if (t && t.toLowerCase() === PHOTO_OPT_OUT_TITLE) return { isPhoto: true };
  return { isPhoto: false, caption: t || undefined };
}
