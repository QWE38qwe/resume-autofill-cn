#!/bin/zsh
set -euo pipefail

HOST_NAME="cn.local.jianfill.mail"
ROOT="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_ID="${1:-}"

if [[ ! "$EXTENSION_ID" =~ ^[a-p]{32}$ ]]; then
  echo "用法: ./native-host/install.sh <扩展ID>"
  echo "扩展 ID 可在 chrome://extensions 的“简填”卡片中查看。"
  exit 2
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "未找到 uv，请先安装：https://docs.astral.sh/uv/"
  exit 3
fi

cd "$ROOT"
uv sync
chmod 700 "$ROOT/run-host.sh"
"$ROOT/.venv/bin/python" \
  -m job_email_assistant.export_local_config \
  "$ROOT/local-config.json"

MANIFEST=$(cat <<EOF
{
  "name": "$HOST_NAME",
  "description": "简填邮件待办本地桥接",
  "path": "$ROOT/run-host.sh",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXTENSION_ID/"]
}
EOF
)

TARGETS=(
  "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
  "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
)

for directory in "${TARGETS[@]}"; do
  mkdir -p "$directory"
  printf '%s\n' "$MANIFEST" >"$directory/$HOST_NAME.json"
  chmod 600 "$directory/$HOST_NAME.json"
done

echo "Native Host 安装完成。"
echo "设置页本地配置文件已生成。"
echo "请在扩展管理页重新加载“简填”，再到“邮件待办”测试连接。"
