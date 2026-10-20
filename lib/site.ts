export const SITE_URL = "https://www.airoomredo.com";

export const TIKTOK_URL = "https://www.tiktok.com/@roomredoai";

export const SUPPORT_EMAIL = "support@airoomredo.com";

/** The app is live; set this to its App Store URL. Unset,
 * every App Store button renders as a non-link "Coming soon" state with the
 * waitlist form as the fallback. Inlined at build time. */
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || null;

/** App Store Connect provider token (`pt`) for campaign links. Public by
 * design (it sits in every campaign URL). Inlined at build time. */
export const APP_STORE_PROVIDER_TOKEN = process.env.NEXT_PUBLIC_APP_STORE_PROVIDER_TOKEN || null;

const APP_STORE_ID = "6812385415";

/** The App Store link carrying install attribution: with a provider token,
 * `?pt=<token>&ct=<campaign>&mt=8` so App Store Connect reports impressions
 * and downloads per campaign (one per article). Without a token it falls back
 * to the plain listing URL, so links never break. Null while the app is not
 * live (APP_STORE_URL unset). */
export function appStoreCampaignUrl(campaign: string): string | null {
  if (!APP_STORE_URL) return null;
  if (!APP_STORE_PROVIDER_TOKEN) return APP_STORE_URL;
  const q = new URLSearchParams({ pt: APP_STORE_PROVIDER_TOKEN, ct: campaign, mt: "8" });
  return `https://apps.apple.com/app/apple-store/id${APP_STORE_ID}?${q.toString()}`;
}
