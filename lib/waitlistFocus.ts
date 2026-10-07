export type WaitlistInstance = "hero" | "close";

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
