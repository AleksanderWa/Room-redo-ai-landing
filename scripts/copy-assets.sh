#!/usr/bin/env bash
# Copies the landing page's images into public/images/ (and the favicon into
# app/), from three places:
#
#   1. The RoomRedo app repo (style thumbs, icon, and the under-stairs
#      photo the corners section starts from).
#   2. The corners section's results: the app's corner-flow results for
#      that photo, in CORNER_RESULTS_DIR (mapping: scripts/corner-results.json).
#      scripts/make-corner-crops.mjs aligns them to the photo and cuts the
#      photo and every result with one shared 3:4 crop. Skipped (keeping the
#      committed images) when CORNER_RESULTS_DIR isn't set.
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

# 1c. App icon: favicon + header/footer mark.
copy "$APP_REPO/assets/icon-master.png" "app/icon.png"
copy "$APP_REPO/assets/icon-master.png" "$DEST/brand-icon.png"

# Temp dirs removed on exit, however the script ends.
TMP_DIRS=()
cleanup() { if [ ${#TMP_DIRS[@]} -gt 0 ]; then rm -rf "${TMP_DIRS[@]}"; fi; }
trap cleanup EXIT

# 2. Corners section: the under-stairs photo + the app's results for it,
# aligned and cropped together (no proofs; run the script by hand for those).
CORNER_BEFORE="$APP_REPO/assets/e2e/corner-understairs.jpg"
if [ -z "${CORNER_RESULTS_DIR:-}" ]; then
  echo "note: CORNER_RESULTS_DIR not set — keeping the committed corner images."
elif [ ! -f "$CORNER_BEFORE" ]; then
  echo "warning: missing $CORNER_BEFORE" >&2
  missing=1
else
  CORNER_OUT="$(mktemp -d)"
  TMP_DIRS+=("$CORNER_OUT")
  node scripts/make-corner-crops.mjs --before="$CORNER_BEFORE" --out="$CORNER_OUT" --no-proofs
  cp "$CORNER_OUT"/understairs-*.jpg "$DEST/corner/"
  echo "corner before + results written"
fi

# 2b. Hero pair + the "How it works" reveal (step-reveal.jpg), built by
# make-hero-crops.mjs (alignment + 9:16 crop). Only the 9x16 variant, no
# proofs; run the script by hand to get the proof composites.
HERO_BEFORE="$BACKEND_REPO/fixtures/qa-photos/cluttered-bedroom.jpg"
HERO_AFTER="$APP_REPO/assets/images/styles/japandi.jpg"
if [ -f "$HERO_BEFORE" ] && [ -f "$HERO_AFTER" ]; then
  HERO_OUT="$(mktemp -d)"
  TMP_DIRS+=("$HERO_OUT")
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
