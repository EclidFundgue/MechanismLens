#!/usr/bin/env bash
# Self-contained MechanismLens dependency check.
# External skills are intentionally not checked: the runtime, scene renderers,
# subtitle layer, evidence UI, schemas, and launchers ship with this skill.
set -uo pipefail

have() { command -v "$1" >/dev/null 2>&1; }
missing=()

echo "MechanismLens · environment check"
echo "───────────────────────────────────────────"

if have node; then
  version="$(node -v 2>/dev/null || echo '?')"
  major="${version#v}"; major="${major%%.*}"
  if [[ "$major" =~ ^[0-9]+$ ]] && (( major >= 18 )); then
    printf '  [OK]       node       %s\n' "$version"
  else
    printf '  [MISS]     node       %s (requires >= 18)\n' "$version"
    missing+=("node>=18")
  fi
else
  printf '  [MISS]     node       required to scaffold and build\n'
  missing+=("node")
fi

if have npm; then
  printf '  [OK]       npm        %s\n' "$(npm -v 2>/dev/null || echo '?')"
else
  printf '  [MISS]     npm        required to build the bundled runtime\n'
  missing+=("npm")
fi

if have curl || have wget; then
  printf '  [OK]       download   %s\n' "$(have curl && echo curl || echo wget)"
else
  printf '  [WARN]     download   curl/wget missing; URL inputs need agent web tools\n'
fi

if have pdftotext; then
  printf '  [OK]       PDF text   pdftotext\n'
elif have python3 && { python3 -c "import fitz" >/dev/null 2>&1 || python3 -c "import pymupdf" >/dev/null 2>&1; }; then
  printf '  [OK]       PDF text   python3 + pymupdf\n'
else
  printf '  [WARN]     PDF text   pdftotext/pymupdf missing; prefer LaTeX or web text\n'
fi

if have pdftocairo || have pdfimages; then
  printf '  [OK]       PDF image  poppler tools\n'
else
  printf '  [WARN]     PDF image  extraction tools missing; use supplied figures when possible\n'
fi

if have ffmpeg; then
  printf '  [OK]       video      ffmpeg (optional)\n'
else
  printf '  [OPT-MISS] video      ffmpeg (only needed for MP4 export)\n'
fi

echo "───────────────────────────────────────────"
if ((${#missing[@]} > 0)); then
  echo "Missing required tools: ${missing[*]}"
  exit 1
fi
echo "Ready. No external skills are required."
