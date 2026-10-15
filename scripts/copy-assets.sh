#!/usr/bin/env bash
# Copies the landing page's images into public/images/ (and the favicon into
# app/), from three places:
#
#   1. The RoomRedo app repo (style thumbs, corner pair, icon).
#   2. The backend repo (the three "Or becomes" corner tiles: real results
#      from verify runs on the same under-stairs photo as the corner pair).
#      These are cropped to 3:4 and re-encoded (q82 progressive JPEG via
#      sharp), not copied.
#   2b. Hero pair: the backend's cluttered-bedroom QA photo and the app's
#      Japandi result for it, aligned and cropped to 9:16 (720x1280) by
#      scripts/make-hero-crops.mjs, plus step-reveal.jpg from the same pair.
#
#   Both paths default to sibling checkouts; override with APP_REPO /
#   BACKEND_REPO:
#
#        APP_REPO=/path/to/Room-redo-app BACKEND_REPO=/path/to/room-redo-backend \
#          bash scripts/copy-assets.sh
#
#   3. Optionally, design-assets/ in this repo's root (the storage "after"
#      the OG image is cut from). Skipped if it isn't there;
#      the copies already committed in public/images/ are used as-is.
#
# Run from the repo root. Then, if storage-after.jpg changed:
#   node scripts/generate-og-image.mjs

set -euo pipefail

APP_REPO="${APP_REPO:-../Room-redo-app}"
BACKEND_REPO="${BACKEND_REPO:-../room-redo-backend}"
DEST="public/images"

if [ ! -d "$APP_REPO/assets" ]; then
  echo "error: $APP_REPO/assets not found — set APP_REPO to the app repo checkout." >&2
  exit 1
fi

mkdir -p "$DEST/styles" "$DEST/corner"

missing=0
copy() {
  local from="$1" to="$2"
  if [ ! -f "$from" ]; then
    echo "warning: missing $from" >&2
    missing=1
    return
  fi
  cp "$from" "$to"
  echo "copied $from -> $to"
}

# 1a. Style wall: all 47 card thumbnails (480x642), same names as the app's
# style ids, which data/styles.ts uses verbatim.
for f in "$APP_REPO"/assets/images/styles/thumbs/*.jpg; do
  copy "$f" "$DEST/styles/$(basename "$f")"
done

# 1b. Corners section. The before/after pair must be the same space (the
# under-stairs set); never mix a before and an after from different sets.
copy "$APP_REPO/assets/e2e/corner-understairs.jpg" "$DEST/corner/understairs-before.jpg"
copy "$APP_REPO/assets/images/corner/useable.jpg" "$DEST/corner/understairs-after.jpg"

# 1c. App icon: favicon + header/footer mark.
copy "$APP_REPO/assets/icon-master.png" "app/icon.png"
copy "$APP_REPO/assets/icon-master.png" "$DEST/brand-icon.png"

# 2. Corner tiles from the backend's verify runs (same under-stairs photo).
# Each is cropped to a 3:4 window (left and width as fractions of the source
# width, vertical position 0..1) so the floor-level design fills the tile
# instead of the white underside of the stairs; the tea nook's crop also
# drops the box and bag at the far left.
reencode() {
  local from="$1" to="$2" left="$3" width="$4" ypos="$5"
  if [ ! -f "$from" ]; then
    echo "warning: missing $from" >&2
    missing=1
    return
  fi
  node --input-type=module -e '
    import sharp from "sharp";
    const [from, to, left, width, ypos] = process.argv.slice(1);
    const m = await sharp(from).metadata();
    const w = Math.round(m.width * Number(width));
    const h = Math.min(m.height, Math.round((w * 4) / 3));
    await sharp(from)
      .extract({ left: Math.round(m.width * Number(left)), top: Math.round((m.height - h) * Number(ypos)), width: w, height: h })
      .jpeg({ quality: 82, progressive: true })
      .toFile(to);
  ' "$from" "$to" "$left" "$width" "$ypos"
  echo "re-encoded $from -> $to"
}
VERIFY="$BACKEND_REPO/verify-out"
reencode "$VERIFY/2026-09-10-d4-bold-realism-constraint/understairs_rep1.jpg" "$DEST/corner/understairs-tea-nook.jpg" 0.27 0.72 0.85
reencode "$VERIFY/2026-09-10-d4-bold-surprise-me-understairs/rep3.jpg" "$DEST/corner/understairs-zen-garden.jpg" 0.18 0.74 0.8
reencode "$VERIFY/2026-09-10-d4-bold-realism-constraint/understairs_rep2.jpg" "$DEST/corner/understairs-climbing-wall.jpg" 0.16 0.74 0.8

# 2b. Hero pair + the "How it works" reveal (step-reveal.jpg), built by
# make-hero-crops.mjs (alignment + 9:16 crop). Only the 9x16 variant, no
# proofs; run the script by hand to get the proof composites.
HERO_BEFORE="$BACKEND_REPO/fixtures/qa-photos/cluttered-bedroom.jpg"
HERO_AFTER="$APP_REPO/assets/images/styles/japandi.jpg"
if [ -f "$HERO_BEFORE" ] && [ -f "$HERO_AFTER" ]; then
  HERO_OUT="$(mktemp -d)"
  trap 'rm -rf "$HERO_OUT"' EXIT
  node scripts/make-hero-crops.mjs --before="$HERO_BEFORE" --after="$HERO_AFTER" \
    --out="$HERO_OUT" --variants=9x16 --no-proofs
  cp "$HERO_OUT/hero-9x16-before.jpg" "$DEST/hero-before.jpg"
  cp "$HERO_OUT/hero-9x16-after.jpg" "$DEST/hero-after.jpg"
  cp "$HERO_OUT/step-reveal.jpg" "$DEST/step-reveal.jpg"
  echo "hero pair + step-reveal written"
else
  echo "warning: missing $HERO_BEFORE or $HERO_AFTER" >&2
  missing=1
fi

# 3. Original design export (optional).
SRC="design-assets"
if [ -d "$SRC" ]; then
  declare -a MAP=(
    "05-reveal-after-storage.jpg:storage-after.jpg"
  )
  for pair in "${MAP[@]}"; do
    copy "$SRC/${pair%%:*}" "$DEST/${pair##*:}"
  done
else
  echo "note: $SRC/ not found — keeping the committed storage image."
fi

if [ "$missing" -eq 1 ]; then
  echo "warning: some source files were missing (see above)." >&2
  exit 1
fi

echo "done."
