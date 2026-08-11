#!/usr/bin/env bash
# Copies and renames the approved design assets from design-assets/ (repo
# root) into public/images/, per the exact mapping given in the project
# spec. Run once after adding design-assets/ to the repo root:
#
#   bash scripts/copy-assets.sh
#
# 06-paywall-blur-*.jpg files are intentionally skipped — they belong to the
# app, not this landing page.

set -euo pipefail

SRC="design-assets"
DEST="public/images"

if [ ! -d "$SRC" ]; then
  echo "error: $SRC/ not found in repo root — add the design assets first." >&2
  exit 1
fi

mkdir -p "$DEST"

declare -a MAP=(
  "01-welcome-before.jpg:hero-before.jpg"
  "01-welcome-after.jpg:hero-after.jpg"
  "05-reveal-before-storage.jpg:storage-before.jpg"
  "05-reveal-after-storage.jpg:storage-after.jpg"
  "02-stylecard-japandi.jpg:style-japandi.jpg"
  "02-stylecard-coastal.jpg:style-coastal.jpg"
  "02-stylecard-scandinavian.jpg:style-scandinavian.jpg"
  "02-stylecard-farmhouse.jpg:style-farmhouse.jpg"
  "02-stylecard-darkluxury.jpg:style-darkluxury.jpg"
  "02-stylecard-softparisian.jpg:style-softparisian.jpg"
  "08-roomdetail-japandi.jpg:detail-japandi.jpg"
)

missing=0
for pair in "${MAP[@]}"; do
  from="${pair%%:*}"
  to="${pair##*:}"
  if [ ! -f "$SRC/$from" ]; then
    echo "warning: missing $SRC/$from" >&2
    missing=1
    continue
  fi
  cp "$SRC/$from" "$DEST/$to"
  echo "copied $from -> $DEST/$to"
done

if [ "$missing" -eq 1 ]; then
  echo "warning: some source files were missing (see above)." >&2
  exit 1
fi

echo "done. Next: node scripts/generate-og-image.mjs"
