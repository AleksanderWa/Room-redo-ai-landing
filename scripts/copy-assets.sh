#!/usr/bin/env bash
# Copies the landing page's images into public/images/ (and the favicon into
# app/), from three places:
#
#   1. The RoomRedo app repo (style thumbs, corner pair, icon).
#   2. The backend repo (the three "Or becomes" corner tiles: real results
#      from verify runs on the same under-stairs photo as the corner pair).
#      These are re-encoded (q82 progressive JPEG via sharp), not copied.
#
#   Both paths default to sibling checkouts; override with APP_REPO /
#   BACKEND_REPO:
#
#        APP_REPO=/path/to/Room-redo-app BACKEND_REPO=/path/to/room-redo-backend \
#          bash scripts/copy-assets.sh
#
#   3. Optionally, design-assets/ in this repo's root (hero pair + the
#      storage "after" the OG image is cut from). Skipped if it isn't there;
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
reencode() {
  local from="$1" to="$2"
  if [ ! -f "$from" ]; then
    echo "warning: missing $from" >&2
    missing=1
    return
  fi
  node -e 'require("sharp")(process.argv[1]).jpeg({ quality: 82, progressive: true }).toFile(process.argv[2]).catch((e) => { console.error(e); process.exit(1); })' "$from" "$to"
  echo "re-encoded $from -> $to"
}
VERIFY="$BACKEND_REPO/verify-out"
reencode "$VERIFY/2026-09-10-d4-bold-realism-constraint/understairs_rep1.jpg" "$DEST/corner/understairs-tea-nook.jpg"
reencode "$VERIFY/2026-09-10-d4-bold-surprise-me-understairs/rep3.jpg" "$DEST/corner/understairs-zen-garden.jpg"
reencode "$VERIFY/2026-09-10-d4-bold-realism-constraint/understairs_rep2.jpg" "$DEST/corner/understairs-climbing-wall.jpg"

# 3. Original design export (optional).
SRC="design-assets"
if [ -d "$SRC" ]; then
  declare -a MAP=(
    "01-welcome-before.jpg:hero-before.jpg"
    "01-welcome-after.jpg:hero-after.jpg"
    "05-reveal-after-storage.jpg:storage-after.jpg"
  )
  for pair in "${MAP[@]}"; do
    copy "$SRC/${pair%%:*}" "$DEST/${pair##*:}"
  done
else
  echo "note: $SRC/ not found — keeping the committed hero/storage images."
fi

if [ "$missing" -eq 1 ]; then
  echo "warning: some source files were missing (see above)." >&2
  exit 1
fi

echo "done."
