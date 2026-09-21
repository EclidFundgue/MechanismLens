#!/usr/bin/env bash
# Minimal user configuration for the self-contained runtime.
set -euo pipefail

CONFIG="${PAPER_EXPLAINER_CONFIG:-$HOME/.config/paper-explainer/config.json}"
ACTION="ensure"
LANG="auto"
THEME="paper-dark"
RECORD="false"
AUTO="false"
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --show) ACTION="show"; shift ;;
    --path) ACTION="path"; shift ;;
    --reset) ACTION="reset"; shift ;;
    --ensure) ACTION="ensure"; shift ;;
    --lang=*) LANG="${1#*=}"; shift ;;
    --theme=*) THEME="${1#*=}"; shift ;;
    --record=*) RECORD="${1#*=}"; shift ;;
    --auto-advance=*) AUTO="${1#*=}"; shift ;;
    --force) FORCE=1; ACTION="write"; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

case "$ACTION" in
  path) echo "$CONFIG"; exit 0 ;;
  show) [[ -f "$CONFIG" ]] && cat "$CONFIG" || echo "(not initialized: $CONFIG)"; exit 0 ;;
  reset) rm -f "$CONFIG"; echo "Removed: $CONFIG"; exit 0 ;;
esac

if [[ -f "$CONFIG" && "$FORCE" != "1" ]]; then
  if command -v node >/dev/null 2>&1; then
    node - "$CONFIG" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
let cfg;
try { cfg = JSON.parse(fs.readFileSync(file, "utf8")); }
catch (error) { console.error(`Invalid config: ${error.message}`); process.exit(3); }

const old = cfg;
cfg = {
  version: 3,
  theme: typeof old.theme === "string" ? old.theme : old.theme?.id || "paper-dark",
  narration: { language: old.narration?.language || "auto" },
  playback: { autoAdvance: old.playback?.autoAdvance ?? old.recording?.autoAdvance ?? false },
  recording: { enabled: old.recording?.enabled ?? false },
  updatedAt: new Date().toISOString(),
  createdAt: old.createdAt || new Date().toISOString(),
};
fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
console.log(JSON.stringify(cfg, null, 2));
NODE
  else
    cat "$CONFIG"
  fi
  exit 0
fi

case "$LANG" in auto|zh|en) ;; *) echo "bad --lang: $LANG" >&2; exit 2 ;; esac
case "$RECORD" in true|false) ;; *) echo "bad --record: $RECORD" >&2; exit 2 ;; esac
case "$AUTO" in true|false) ;; *) echo "bad --auto-advance: $AUTO" >&2; exit 2 ;; esac
[[ "$THEME" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "bad --theme: $THEME" >&2; exit 2; }

mkdir -p "$(dirname "$CONFIG")"
NOW="$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S%z)"
cat > "$CONFIG" <<EOF
{
  "version": 3,
  "theme": "$THEME",
  "narration": { "language": "$LANG" },
  "playback": { "autoAdvance": $AUTO },
  "recording": { "enabled": $RECORD },
  "createdAt": "$NOW",
  "updatedAt": "$NOW"
}
EOF
echo "Config ready: $CONFIG"
cat "$CONFIG"
