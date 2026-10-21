/** Each id is one rendered WaitlistForm. The article ones are the closing
 * blocks of articles, the hubs and the author page; the other article
 * CTAs (top, mid, sticky) scroll to "article-end" instead of rendering one. */
export type WaitlistInstance = "hero" | "close" | "article-end" | "guides-hub" | "ideas-hub" | "author";

export function waitlistInputId(instance: WaitlistInstance): string {
  return `waitlist-email-${instance}`;
}

export function waitlistStatusId(instance: WaitlistInstance): string {
  return `waitlist-status-${instance}`;
}

/**
 * Moves focus to a waitlist form's email field: the "Get the launch email"
 * link, the pre-launch App Store badge right above it, and the header pill
 * (which targets the hero form from the top of the page) all use this.
 * `scroll` centers the field first, for callers that aren't next to it.
 * After a successful signup the field is gone, so scroll to the
 * confirmation instead.
 */
export function focusWaitlist(instance: WaitlistInstance, { scroll = false } = {}): void {
  const input = document.getElementById(waitlistInputId(instance));
  if (input) {
    if (scroll) input.scrollIntoView({ block: "center", behavior: "smooth" });
    input.focus({ preventScroll: scroll });
    return;
  }
  document.getElementById(waitlistStatusId(instance))?.scrollIntoView({ block: "center", behavior: "smooth" });
}
