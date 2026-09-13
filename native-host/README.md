# 简填本地邮件桥接

Native Host 负责在本机读取 IMAP 邮箱、调用用户配置的 OpenAI-compatible 模型，并把结构化邮件待办返回给浏览器扩展。任务状态、完成时间和备注均由扩展保存在本地，不写入外部表格。

## 安装

- Windows：`powershell -ExecutionPolicy Bypass -File .\install-windows.ps1 -ExtensionId <扩展 ID>`
- macOS/Linux：`./install.sh <扩展 ID>`

配置可通过扩展设置页保存，也可使用 `local-config.json` 提供邮箱和模型参数。运行测试：

```bash
uv run --extra dev pytest -q
```

邮件正文是不可信输入，只能参与分类和结构化抽取；公司无法可靠识别时返回待修正，不会创建外部记录。
