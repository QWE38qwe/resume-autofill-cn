# 简填邮件待办本地桥接

Native Messaging Host 负责在本机连接 IMAP、调用用户配置的
OpenAI-compatible 模型，并更新飞书多维表格。扩展通过标准输入输出传递单次
请求，桥接不会监听网络端口。

## 安装

1. 在 `chrome://extensions` 开启开发者模式并加载插件根目录。
2. 从“简填”扩展卡片复制 32 位扩展 ID。
3. 运行：

```bash
cd "/Users/bytedance/Desktop/简填插件_V0.4.0"
./native-host/install.sh <扩展ID>
```

脚本使用 `uv` 创建隔离的 Python 3.12 环境，并分别注册 Chrome 与 Edge 的
Native Messaging manifest。脚本还会从 `.env` 生成权限为 `600` 的
`local-config.json`，供设置页导入并明文展示本机配置；两者均已被 Git 忽略。
重新加载扩展后，在“邮件待办”点击“测试连接”。

## 卸载

```bash
./native-host/uninstall.sh
```

去重数据库保存在安装目录的 `data/state.db`。删除该文件会使捕捉周期内邮件
重新参与识别；已成功写入和已忽略邮件会继续保持去重。

## 开发检查

```bash
cd native-host
uv sync --extra dev
uv run pytest
```
