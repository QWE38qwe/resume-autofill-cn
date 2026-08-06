#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

files=()
while IFS= read -r file; do
  files+=("$file")
done < <(find . -maxdepth 2 -type f \
  \( -name '*.js' -o -name '*.html' -o -name '*.css' -o -name '*.md' -o -name '*.json' \) \
  ! -path './vendor/*' ! -path './.git/*' -print)

if ((${#files[@]} == 0)); then
  echo "No source files found."
  exit 1
fi

patterns=(
  'sk-[A-Za-z0-9_-]{16,}'
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
  '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
  '(^|[^0-9])1[3-9][0-9]{9}([^0-9]|$)'
  'AKIA[0-9A-Z]{16}'
  'gh[pousr]_[A-Za-z0-9]{20,}'
  'github_pat_[A-Za-z0-9_]{20,}'
)

failed=0
for pattern in "${patterns[@]}"; do
  if rg -n --pcre2 -- "$pattern" "${files[@]}"; then
    failed=1
  fi
done

if ((failed)); then
  echo "Privacy check failed."
  exit 1
fi

echo "Privacy check passed."
