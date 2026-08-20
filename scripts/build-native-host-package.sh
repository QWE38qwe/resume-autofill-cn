#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(
  sed -n 's/^__version__ = "\(.*\)"/\1/p' \
    "$ROOT/native-host/src/job_email_assistant/__init__.py"
)"
RELEASE_DIR="$ROOT/release"
OUTPUT="$RELEASE_DIR/jianfill-native-host-${VERSION}.zip"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/native-host" "$RELEASE_DIR"
cp -R "$ROOT/native-host/src" "$STAGE/native-host/"
cp \
  "$ROOT/native-host/pyproject.toml" \
  "$ROOT/native-host/uv.lock" \
  "$ROOT/native-host/README.md" \
  "$ROOT/native-host/install.sh" \
  "$ROOT/native-host/install-windows.ps1" \
  "$ROOT/native-host/uninstall.sh" \
  "$ROOT/native-host/uninstall-windows.ps1" \
  "$ROOT/native-host/run-host.sh" \
  "$STAGE/native-host/"

find "$STAGE" -name "__pycache__" -type d -prune -exec rm -rf {} +
find "$STAGE" -name "*.egg-info" -type d -prune -exec rm -rf {} +
rm -f "$OUTPUT"
(
  cd "$STAGE"
  /usr/bin/zip -X -q -r "$OUTPUT" native-host
)

if /usr/bin/unzip -Z1 "$OUTPUT" | rg -q \
  '(^|/)(\.env|local-config\.json|state\.db|tracker/state|\.venv|\.pytest_cache)(/|$)'; then
  echo "Native Host package contains a blocked private path." >&2
  exit 1
fi

echo "$OUTPUT"
