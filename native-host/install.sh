#!/bin/zsh
set -euo pipefail

HOST_NAME="cn.local.jianfill.mail"
ROOT="$(cd "$(dirname "$0")" && pwd)"
INSTALL_ROOT="$HOME/Library/Application Support/Jianfill Mail Host"
TRACKER_AUTH_SOURCE="$HOME/Documents/trae_projects/feishucli/autotrack/state/auth"
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

mkdir -p "$INSTALL_ROOT"
/usr/bin/ditto "$ROOT/src" "$INSTALL_ROOT/src"
cp "$ROOT/pyproject.toml" "$ROOT/uv.lock" "$ROOT/run-host.sh" "$INSTALL_ROOT/"
mkdir -p "$INSTALL_ROOT/tracker/state/auth"
if [[ -d "$TRACKER_AUTH_SOURCE" ]]; then
  /usr/bin/ditto "$TRACKER_AUTH_SOURCE" "$INSTALL_ROOT/tracker/state/auth"
fi
if [[ -f "$ROOT/.env" ]]; then
  cp "$ROOT/.env" "$INSTALL_ROOT/.env"
  chmod 600 "$INSTALL_ROOT/.env"
fi

cd "$INSTALL_ROOT"
uv sync
uv run playwright install chromium
chmod 700 "$INSTALL_ROOT/run-host.sh"
"$INSTALL_ROOT/.venv/bin/python" \
  -m job_email_assistant.export_local_config \
  "$ROOT/local-config.json"

MANIFEST=$(cat <<EOF
{
  "name": "$HOST_NAME",
  "description": "简填邮件待办本地桥接",
  "path": "$INSTALL_ROOT/run-host.sh",
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
