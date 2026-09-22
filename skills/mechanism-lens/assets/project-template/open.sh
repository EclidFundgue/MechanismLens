#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if [ ! -f "$ROOT/site/index.html" ]; then
  echo "First launch: building the explainer..."
  command -v npm >/dev/null 2>&1 || {
    echo "Node.js and npm are required for the first build." >&2
    exit 1
  }
  cd "$ROOT/project"
  [ -d node_modules ] || npm install
  npm run build
fi

if command -v node >/dev/null 2>&1; then
  exec node "$ROOT/runtime/serve.mjs" "$ROOT/site" --open
elif command -v python3 >/dev/null 2>&1; then
  exec python3 "$ROOT/runtime/serve.py" "$ROOT/site" --open
elif command -v python >/dev/null 2>&1; then
  exec python "$ROOT/runtime/serve.py" "$ROOT/site" --open
else
  echo "Could not find Node.js or Python to start the local viewer." >&2
  exit 1
fi
