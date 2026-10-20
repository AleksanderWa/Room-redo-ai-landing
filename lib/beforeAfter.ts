/** Divider position (percent) at or beyond which a look change re-centres it. */
export const RESET_AT_PCT = 95;

/** A reader parked on "all before" who picks another look would see nothing
 *  change, so a divider at or past RESET_AT_PCT goes back to the middle. */
export function pctAfterLookChange(pct: number): number {
  return pct >= RESET_AT_PCT ? 50 : pct;
}
