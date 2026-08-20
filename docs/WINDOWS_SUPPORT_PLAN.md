# Windows 支持与资料迁移方案

## 结论

简填的核心扩展能力可以运行在 Windows Chrome / Edge：

- 个人资料、简历版本和规则管理
- 网申页面字段识别与自动填充
- 本地网申记录
- 用户自行配置的 AI 字段映射

Native Messaging 本地桥接已提供 Windows 开发版适配：

1. Chrome Web Store 扩展：提供全部纯浏览器能力。
2. PowerShell 开发安装脚本：安装同一 Python 包，提供 IMAP 邮件同步和招聘站巡检。

当前仍缺少面向普通用户的签名 EXE 安装器和 Windows 真机 E2E 证据。

## 个人资料保存方式

当前资料保存在当前浏览器配置文件的 `chrome.storage.local` 中。它不会因为登录
同一个 Chrome 账号就可靠地同步到另一台电脑，也不应直接迁移 Chrome 用户目录。

### 推荐 MVP：密码加密备份包

在设置页增加：

- `导出加密备份`
- `导入加密备份`
- 导出范围预览
- 导入冲突策略：合并 / 覆盖

备份文件扩展名建议为 `.jianfill-backup`，格式包含：

- schema 版本
- 导出时间
- 个人资料、教育、项目、技能、证书、家庭信息
- 简历版本、自定义字段、固定回答规则
- 可选的网申历史

默认排除：

- AI API Key
- 邮箱客户端授权码
- 飞书 App Secret
- 招聘网站 Cookie / storage state
- Native Host 加密密钥

加密建议使用 Web Crypto：

- KDF：PBKDF2-SHA-256，随机 salt，至少 310,000 次迭代
- 加密：AES-256-GCM，随机 IV
- 文件中只保存 salt、IV、迭代次数、密文和格式版本
- 密码不保存、不上传

该方案能让用户在 macOS 导出、Windows 导入，且不需要建设云账号系统。

### 后续方案：端到端加密云同步

只有在多设备持续同步成为核心需求后再建设。服务端只存密文，密钥由用户密码派生，
不应让服务端持有可解密个人简历的数据。

## Windows Native Host

### 当前开发版

`native-host/install-windows.ps1` 会：

- 安装到 `%LOCALAPPDATA%\Jianfill\MailHost`。
- 使用 uv 创建隔离环境和 `jianfill-mail-host.exe` 启动器。
- 安装 Playwright Chromium。
- 写入当前用户的 Chrome / Edge Native Messaging 注册表。
- 使用当前 Windows 用户 DPAPI 保护 Fernet 登录态密钥。

设置页可在 macOS / Windows 之间切换并复制对应命令。

### 正式交付建议

面向普通用户不应要求安装 Python 或 uv。推荐用 PyInstaller 生成单文件可执行程序，
再用 Inno Setup 或 WiX 打包安装器。

建议目录：

```text
%LOCALAPPDATA%\Jianfill\MailHost\
  jianfill-mail-host.exe
  cn.local.jianfill.mail.json
  data\
  tracker\state\auth\
```

安装器需要：

1. 安装 `jianfill-mail-host.exe`。
2. 生成 Native Messaging manifest。
3. 写入 Chrome 注册表：
   `HKCU\Software\Google\Chrome\NativeMessagingHosts\cn.local.jianfill.mail`
4. 写入 Edge 注册表：
   `HKCU\Software\Microsoft\Edge\NativeMessagingHosts\cn.local.jianfill.mail`
5. 提供卸载程序，删除注册表项；用户数据默认保留并询问是否删除。

### 密钥与登录态

`AuthStore` 已拆成平台后端：

- macOS：Keychain
- Windows：DPAPI

Windows 已使用 DPAPI 保护随机 Fernet key，密文状态继续存放在用户本地目录。不要把 macOS
Keychain 密钥复制到 Windows，也不要把招聘站 Cookie 放入普通资料备份。

### 签名

未签名安装器会触发 SmartScreen 警告。公开发布前应购买 Authenticode 代码签名证书，
对 EXE 和安装器签名，并在干净的 Windows 11 x64 环境验证安装、升级和卸载。

## 实施顺序

### P0：跨设备资料迁移

- 实现加密备份导出 / 导入
- 加 schema 版本和迁移测试
- 在 macOS Chrome 与 Windows Chrome 做交叉导入验收

### P1：Windows 本地桥接

- [x] 抽象平台密钥存储
- [x] 使用 `%LOCALAPPDATA%` 作为运行目录
- [x] 增加 PowerShell 开发安装脚本
- [x] 注册 Chrome / Edge Native Messaging
- [ ] Windows 11 x64 真机 Ping、邮件同步和巡检 E2E
- 生成 PyInstaller 可执行程序和安装器

### P2：发布工程

- Authenticode 签名
- GitHub Release 自动构建
- 自动升级或明确的版本检查
- Windows 11 x64 E2E 回归

## 验收矩阵

| 场景 | 目标证据 |
| --- | --- |
| macOS 导出，Windows 导入 | 资料条数和关键字段完全一致 |
| 错误密码导入 | 明确报错且不覆盖现有资料 |
| 旧 schema 导入 | 自动迁移或拒绝并给出版本说明 |
| Windows Chrome 自动填表 | 目标测试页关键字段成功填写 |
| Windows Native Host Ping | 扩展返回桥接版本 |
| 邮件同步 | IMAP 读取并写入测试 Base |
| 登录态巡检 | 支持渠道完成一次真实页面巡检 |
| 卸载 | 注册表清理，用户数据按选择保留或删除 |
