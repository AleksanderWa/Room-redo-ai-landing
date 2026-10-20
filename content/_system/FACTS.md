# Room Redo product facts

The only source for claims about Room Redo in articles. The writer may state a product fact only if it is here. The guard checks every product claim against this file. If an article needs a fact that isn't here, stop and ask; don't guess.

Last checked: 2026-10-20 against the app code (`roomredo-app/src/constants/billing.ts`), backend config (`app/config.py`), the style catalogue, the App Store description (vault: "2026-10-04 App Store Description Rewritten to Match the App") and the landing FAQ (`data/faq.ts`). Update this file whenever any of those change.

## What it is

- Room Redo is an **iPhone app**. It is not on Android and there is no web version.
- App Store: https://apps.apple.com/app/room-redo-ai-interior-design/id6812385415
- You take one photo of your own room (camera or photo library), pick a style, and get that same room redesigned in the new look.
- It starts from your photo, not a stock room.
- A redesign is an idea to look at. It is not a building plan, and details can differ from your photo.

## Rooms and corners

- Rooms that work: bedrooms, living rooms, kitchens, bathrooms, offices, balconies.
- Corners: photograph a single corner and say what it should do. Six purposes: storage, a place to sit, work or study, laundry, a space for kids, a space for your pet. You get an idea for that spot.
- Empty spaces only. Photos with people in them are turned away.
- You can ask for up to three things you'd like in the room, such as plants or a rug. Say "ask for", never promise they will appear.
- Drag between before and after. Try more styles on the same room. Rooms and corners are kept in "My spaces".

## Styles

- Two kinds: **Serious** styles (20), real interior styles such as Japandi, Scandinavian, Soft Parisian, Mid-Century Modern, Art Deco; and **Wild** ideas, such as a spa bath, a cat lounge, a library nook, a coffee and matcha bar, a starry sky ceiling.
- Wild styles rebuild the room around the idea, so expect bigger changes.
- **Style count:** the live catalogue is growing (new styles ship from the server). Do not write an exact total. Safe wording: "more than 45 styles", "20 Serious styles and over 25 Wild ideas". (App Store text and the landing page still say 47; the catalogue serves more.)
- Style names and IDs: `data/styles.ts` in the landing repo.

## Free and paid

- **The first redesign is free**, one per device. It is the full redesign, in any style, with a small Room Redo watermark. The watermark stays until the device has bought something.
- **No account:** no sign-up, no email, no password. Your device is enough. ("No login" and "no sign up" are true.)
- No free trial on the subscriptions.
- **Prices live in `data/pricing.ts`.** That file is the single source for the plans, the packs and their prices. Articles show prices only through `::pricing`. When a price changes, update `data/pricing.ts` and this list together.
- As of 2026-10-20:
  - Weekly plan: $9.99 per week, 15 redesigns each week.
  - Monthly plan: $19.99 per month, 50 redesigns each month.
  - One-time packs: 10 redesigns for $4.99, 20 redesigns for $9.99.
- Every plan and pack works on rooms and corners, in all styles. Unused redesigns stay available in the app. They are tracked by the device's private ID; there is still no account. Say "stay available", never "stay on your account".
- Plans renew automatically until cancelled. Cancel any time in iPhone Settings, under Subscriptions.
- Prices are US App Store prices. Don't state prices for other countries.

## Speed

- No measured duration claim exists. Don't write "seconds" or "in a minute". Safe wording: "the app shows the redesign developing as it happens".

## Privacy (say only this)

- No account. The device creates a private ID used to keep track of redesigns and purchases.
- Photos are stored so your rooms stay in My spaces. You can delete your data from Settings in the app.
- Never claim: "we don't train on your photos", "deleted immediately", "only used for this", or anything else we can't prove.

## Never say

- Any provider or vendor name (AI model providers, analytics, payments, hosting).
- "Unlimited".
- That the app keeps your layout, walls, ceiling or furniture exactly. No preservation promises. (Measured: sloped ceilings are kept about 63% of the time; mirrored wardrobes come back as plain panels.)
- That you can remove objects after the result. That feature is switched off.
- Saving to Photos or sharing the image (not in the app as of this check).
- Room types or features not listed above (gardens, exteriors, floor plans, 3D, AR, virtual staging for realtors).
- Ratings, review counts, user numbers or download numbers, unless added here with a source.
