#!/bin/zsh
set -euo pipefail

HOST_NAME="cn.local.jianfill.mail"
TARGETS=(
  "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
  "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
)

for directory in "${TARGETS[@]}"; do
  rm -f "$directory/$HOST_NAME.json"
done

echo "Native Host 已卸载。"
