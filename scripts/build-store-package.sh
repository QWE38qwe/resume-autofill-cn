#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(
  node -e "process.stdout.write(require('$ROOT/manifest.json').version)"
)"
RELEASE_DIR="$ROOT/release"
OUTPUT="$RELEASE_DIR/jianfill-${VERSION}-chrome-web-store.zip"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

"$ROOT/scripts/privacy-check.sh"
node --check "$ROOT/background.js"
node --check "$ROOT/content.js"
node --check "$ROOT/manager.js"
node --check "$ROOT/popup.js"

files=(
  manifest.json
  background.js
  content.js
  manager.css
  manager.js
  options.html
  popup.html
  popup.js
  styles.css
)

for file in "${files[@]}"; do
  cp "$ROOT/$file" "$STAGE/$file"
done
cp -R "$ROOT/icons" "$ROOT/vendor" "$STAGE/"
mkdir -p "$STAGE/scripts"
cp "$ROOT/scripts/readme-demo.js" "$STAGE/scripts/"

mkdir -p "$RELEASE_DIR"
rm -f "$OUTPUT"
(
  cd "$STAGE"
  /usr/bin/zip -X -q -r "$OUTPUT" .
)

if /usr/bin/unzip -Z1 "$OUTPUT" | rg -q \
  '(^|/)(\.env|local-config\.json|state\.db|\.dbg|native-host|tests|HANDOFF\.md)(/|$)'; then
  echo "Store package contains a blocked private or development path." >&2
  exit 1
fi

echo "$OUTPUT"
