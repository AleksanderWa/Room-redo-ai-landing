// Update when App Store Connect prices change. Check against `FACTS.md`.
// The only place prices live: articles show them through `::pricing`, never typed by hand.
// Prices are strings on purpose: this file mirrors the App Store, no math in the UI.

export type PricingGroupId = "free" | "plans" | "packs";

export type PricingRow = {
  id: string;
  group: PricingGroupId;
  name: string;
  detail: string;
  price: string;
  unit?: string;
};

export const PRICING_GROUPS: { id: PricingGroupId; label?: string; note?: string }[] = [
  { id: "free" },
  { id: "plans", label: "Plans", note: "Renews until you cancel" },
  { id: "packs", label: "Packs", note: "Pay once" },
];

export const PRICING_ROWS: PricingRow[] = [
  { id: "free", group: "free", name: "First redesign", detail: "1 per device, with a small watermark", price: "Free" },
  { id: "weekly", group: "plans", name: "Weekly plan", detail: "15 redesigns each week", price: "$9.99", unit: "per week" },
  { id: "monthly", group: "plans", name: "Monthly plan", detail: "50 redesigns each month", price: "$19.99", unit: "per month" },
  { id: "pack10", group: "packs", name: "Pack of 10", detail: "10 redesigns", price: "$4.99", unit: "one time" },
  { id: "pack20", group: "packs", name: "Pack of 20", detail: "20 redesigns", price: "$9.99", unit: "one time" },
];

export const PRICING_FOOTNOTE =
  "US App Store prices. Plans renew automatically until you cancel. Cancel any time in iPhone Settings, under Subscriptions.";
