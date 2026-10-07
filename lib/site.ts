export const SITE_URL = "https://roomredoai.com";

export const TIKTOK_URL = "https://www.tiktok.com/@roomredoai";

export const SUPPORT_EMAIL = "support@airoomredo.com";

/** Set once the app is live (it's in App Review as of this writing). Unset,
 * every App Store button renders as a non-link "Coming soon" state with the
 * waitlist form as the fallback. Inlined at build time. */
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || null;
