// Ported verbatim from the approved design's DCLogic._valid / email handling.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test((email || "").trim());
}

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}
