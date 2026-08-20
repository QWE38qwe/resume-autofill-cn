# 简填邮件待办本地桥接

Native Messaging Host 负责在本机连接 IMAP、调用用户配置的
OpenAI-compatible 模型，并更新飞书多维表格。扩展通过标准输入输出传递单次
请求，桥接不会监听网络端口。

投递进展巡检使用 Playwright 只读已登录招聘网站的投递页，并更新飞书
`Cookie状态`。首次安装会准备 Chromium。macOS 登录态密钥保存在 Keychain；
Windows 登录态密钥由当前用户 DPAPI 保护。

## 安装

1. 在 `chrome://extensions` 开启开发者模式并加载插件根目录。
2. 从“简填”扩展卡片复制 32 位扩展 ID。
3. 安装 uv。
4. 按系统运行：

macOS：

```bash
./native-host/install.sh <扩展ID>
```

Windows PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File .\native-host\install-windows.ps1 -ExtensionId <扩展ID>
```

脚本使用 `uv` 创建隔离的 Python 环境，并分别注册 Chrome 与 Edge 的
Native Messaging manifest。若仓库 `native-host/.env` 存在，会复制到安装目录；
扩展也可以直接在设置页保存邮箱、飞书和模型配置。

运行目录：

- macOS：`~/Library/Application Support/Jianfill Mail Host`
- Windows：`%LOCALAPPDATA%\Jianfill\MailHost`

重新加载扩展后，在“邮件待办”点击“测试连接”。

## 卸载

macOS：

```bash
./native-host/uninstall.sh
```

Windows 默认只注销 Chrome / Edge 并保留本地数据：

```powershell
.\native-host\uninstall-windows.ps1
```

同时删除本地数据：

```powershell
.\native-host\uninstall-windows.ps1 -RemoveData
```

去重数据库保存在安装目录的 `data/state.db`。删除该文件会使捕捉周期内邮件
重新参与识别；已成功写入和已忽略邮件会继续保持去重。

## 开发检查

```bash
cd native-host
uv sync --extra dev
uv run pytest
```
