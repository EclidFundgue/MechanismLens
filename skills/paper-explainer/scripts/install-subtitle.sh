#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# install-subtitle.sh — copy the global subtitle layer into a scaffolded
# web-video-presentation project.
#
# Usage:
#   bash install-subtitle.sh <presentation-dir>
#
# After copying, wire App.tsx by hand — see
# references/SUBTITLE-AND-RECORDING.md ("App.tsx wiring").
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

DEST="${1:?usage: install-subtitle.sh <presentation-dir>}"
ASSETS="$(cd "$(dirname "${BASH_SOURCE[0]}")/../assets/subtitle" && pwd)"

if [[ ! -d "$DEST/src" ]]; then
  echo "error: $DEST/src not found — is this a scaffolded project?" >&2
  exit 1
fi

mkdir -p "$DEST/src/components" "$DEST/src/hooks"
cp "$ASSETS/Subtitle.tsx"       "$DEST/src/components/Subtitle.tsx"
cp "$ASSETS/Subtitle.css"       "$DEST/src/components/Subtitle.css"
cp "$ASSETS/SubtitleToggle.tsx" "$DEST/src/components/SubtitleToggle.tsx"
cp "$ASSETS/SubtitleToggle.css" "$DEST/src/components/SubtitleToggle.css"
cp "$ASSETS/useSubtitle.ts"     "$DEST/src/hooks/useSubtitle.ts"

# Patched useAudioPlayer: adds a `stepKey` dep so Auto mode re-arms on every
# step even when `src`/estimate don't change (required when there is no audio
# track, where src is always null). See SUBTITLE-AND-RECORDING.md §2.2.
cp "$ASSETS/useAudioPlayer.ts"  "$DEST/src/hooks/useAudioPlayer.ts"

echo "Copied subtitle layer into $DEST:"
echo "  src/components/Subtitle.tsx"
echo "  src/components/Subtitle.css"
echo "  src/components/SubtitleToggle.tsx"
echo "  src/components/SubtitleToggle.css"
echo "  src/hooks/useSubtitle.ts"
echo "  src/hooks/useAudioPlayer.ts   (patched: +stepKey)"
echo
echo "Next: wire App.tsx — see references/SUBTITLE-AND-RECORDING.md."
