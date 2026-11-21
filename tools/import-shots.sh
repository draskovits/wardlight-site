#!/bin/zsh
# Copies the pass-4 captures from the game's site-shots folder into public/, converted for the web: PNGs from Display P3
# to sRGB WebP, clips re-encoded (H.264, no audio, faststart) with a WebP poster from their first frame. The home page
# picks each file up at build time when it exists (src/components/Home.astro, `attune()` and `growth`).
#
#   tools/import-shots.sh [source dir]   (default: the site-shots worktree's build/site-shots/pass4)
#
# Source name (anywhere below)   → published file
#   <el>-hero.png                → public/assets/attune/<el>-hero.webp       (el = ember, verdant, dawn)
#   <el>-spell.mp4               → public/assets/attune/<el>-spell.mp4 + .webp poster
#   <el>-towers.mp4              → public/assets/attune/<el>-towers.mp4 + .webp poster
#   tree-full.png                → public/assets/growth/tree-wide.webp        (the whole tree, no HUD)
#   tree-keystone.png            → public/assets/growth/tree-keystone.webp    (the keystone close-up)
#   memory-sky.png               → public/assets/growth/memory-sky.webp
#   memory-close.png             → public/assets/growth/memory-core.webp
#   memory-pan.mp4               → public/assets/growth/memory-pan.mp4 + .webp poster
set -euo pipefail
SRC=${1:-$HOME/Documents/projects/Wardlight/.claude/worktrees/site-shots/build/site-shots/pass4}
OUT=${0:A:h}/../public/assets
P3TOSRGB="/System/Library/ColorSync/Profiles/sRGB Profile.icc"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT/attune" "$OUT/growth"

# a source by its file name, anywhere under SRC (pass 4 sorts them into element/, tree/, memory/)
src() { find "$SRC" -type f -name "$1" 2>/dev/null | head -1; }
still() { # src.png out.webp max-width
  [[ -n "$1" && -f "$1" ]] || return 0
  sips -m "$P3TOSRGB" -s format png "$1" --out "$TMP/s.png" >/dev/null
  magick "$TMP/s.png" -resize "${3:-2400}x>" -quality 82 "$2"
  echo "$2  $(( $(stat -f%z "$2") / 1024 )) KB"
}
clip() { # src.mp4 out.mp4
  [[ -n "$1" && -f "$1" ]] || return 0
  ffmpeg -loglevel error -y -i "$1" -an -vf "scale='min(1600,iw)':-2" -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart "$2"
  ffmpeg -loglevel error -y -i "$2" -frames:v 1 "$TMP/poster.png"
  magick "$TMP/poster.png" -quality 80 "${2%.mp4}.webp"
  echo "$2  $(( $(stat -f%z "$2") / 1024 )) KB"
}
for el in ember verdant dawn; do
  still "$(src $el-hero.png)" "$OUT/attune/$el-hero.webp" 2000
  clip "$(src $el-spell.mp4)" "$OUT/attune/$el-spell.mp4"
  clip "$(src $el-towers.mp4)" "$OUT/attune/$el-towers.mp4"
done
still "$(src tree-full.png)" "$OUT/growth/tree-wide.webp"
still "$(src tree-keystone.png)" "$OUT/growth/tree-keystone.webp" 1600
still "$(src memory-sky.png)" "$OUT/growth/memory-sky.webp"
still "$(src memory-close.png)" "$OUT/growth/memory-core.webp" 1600
clip "$(src memory-pan.mp4)" "$OUT/growth/memory-pan.mp4"
echo "Done. npm run build, then check the sheets (node tools/check-sheets.mjs)."
