# 邮件同步与飞书 Base 配置

本文从零配置以下链路：

```text
126 / 163 收件箱
  -> macOS / Windows Native Host 通过 IMAP 只读邮件
  -> 本地规则与用户配置的 AI 模型识别招聘动作
  -> 用户自己的飞书自建应用
  -> 用户自己的飞书多维表格
```

## 当前平台支持

| 能力 | macOS | Windows |
| --- | --- | --- |
| 资料管理、简历版本、自动填表 | 支持 | 支持 |
| IMAP 邮件同步 | 支持 | 开发版支持，待 Windows 真机验收 |
| 招聘站后台巡检 | 支持，部分站点需手动核对 | 开发版支持，待 Windows 真机验收 |
| macOS 与 Windows 资料一键迁移 | 尚未支持 | 尚未支持 |

Windows Native Host 使用 PowerShell 安装、当前用户注册表和 DPAPI。两套系统运行
同一个 Python 业务包，但登录态密钥互不兼容。`chrome.storage.local` 不会可靠地
跨设备同步，因此目前没有正式支持的 macOS -> Windows 资料迁移流程。跨平台加密备份方案见
[Windows 支持与资料迁移方案](WINDOWS_SUPPORT_PLAN.md)。

## 一、准备扩展和本地桥接

### 1. 安装扩展

从 [GitHub Releases](https://github.com/QWE38qwe/resume-autofill-cn/releases)
下载 `jianfill-*-chrome-web-store.zip` 并解压。

1. 打开 `chrome://extensions`。
2. 开启开发者模式。
3. 点击“加载已解压的扩展程序”。
4. 选择解压目录。
5. 记录扩展卡片上的 32 位扩展 ID。

### 2. 安装 Native Host

商店扩展 ZIP 不包含 Native Host。可从 GitHub Release 下载
`jianfill-native-host-*.zip` 并解压，也可以克隆本仓库。安装
[uv](https://docs.astral.sh/uv/getting-started/installation/) 后，在包含
`native-host` 目录的位置执行：

macOS：

```bash
./native-host/install.sh <扩展ID>
```

Windows PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File .\native-host\install-windows.ps1 -ExtensionId <扩展ID>
```

安装脚本会：

- 安装隔离的 Python 运行环境。
- 安装 Playwright Chromium。
- 注册 Chrome 和 Edge Native Messaging Host。
- macOS 运行目录：`~/Library/Application Support/Jianfill Mail Host/`。
- Windows 运行目录：`%LOCALAPPDATA%\Jianfill\MailHost`。
- macOS 登录态密钥使用 Keychain，Windows 使用当前用户 DPAPI。

完成后重新加载扩展，在“邮件待办”点击“测试连接”。应显示平台和 Host 版本。

> Chrome Web Store 上架后，商店版扩展 ID 固定。当前通过 GitHub 解压安装时，每次
> 重新加载同一目录通常保持 ID，但更换目录或安装来源后应重新运行安装脚本。

## 二、开启 126 / 163 IMAP

简填需要的是**客户端授权码**，不是网易邮箱网页登录密码。

### 网页端操作

1. 登录网易邮箱网页版：
   - 126 邮箱：<https://mail.126.com/>
   - 163 邮箱：<https://mail.163.com/>
2. 打开“设置”。
3. 进入“POP3/SMTP/IMAP”。
4. 开启 IMAP 服务。只用于收件时不需要开启 POP3。
5. 按网易页面提示完成短信验证。
6. 新增客户端授权密码并立即保存。授权码通常只展示一次。

网易邮箱大师也可以通过：

```text
我 -> 邮箱管理 -> 选择账号 -> 第三方登录管理 -> 通用授权码
```

新增授权码。

### 简填中填写

进入“设置 -> 126 / 163 IMAP”：

| 字段 | 126 邮箱 | 163 邮箱 |
| --- | --- | --- |
| 邮箱账号 | 完整账号，含 `@126.com` 后缀 | 完整账号，含 `@163.com` 后缀 |
| 客户端授权码 | 网易生成的授权码 | 网易生成的授权码 |
| IMAP 地址 | `imap.126.com` | `imap.163.com` |
| SSL 端口 | `993` | `993` |

不要填写：

- 网页登录密码。
- 邮箱昵称。
- 只包含 `@` 前面的用户名。
- SMTP 地址。

## 三、准备飞书多维表格

### 1. 导入零数据模板

下载：
[简填求职追踪模板.xlsx](../templates/feishu-base/%E7%AE%80%E5%A1%AB%E6%B1%82%E8%81%8C%E8%BF%BD%E8%B8%AA%E6%A8%A1%E6%9D%BF.xlsx)

在飞书云空间选择“导入”，目标类型选择“多维表格”。XLSX 无法完整保留 Base 的
字段语义，因此按 [模板字段说明](../templates/feishu-base/README.md) 核对关联、
单选、日期和公式字段。

### 2. 必需字段

插件写入的目标投递表必须至少包含：

| 字段 | 推荐类型 | 用途 |
| --- | --- | --- |
| 公司 | 文本 | 匹配公司主记录 |
| 岗位 | 文本 | 邮件或招聘站岗位名 |
| 进展 | 单选 | 已投递、初筛、待笔试、待面试、已挂等 |
| note | 文本 | 在线测评、ai面试、面试邀约等分类 |
| 测评链接 | 文本 | 邮件中的测评或面试链接 |
| ddl | 文本 | 明确截止时间 |
| 父记录 | 关联当前表 | 子记录关联公司主记录 |
| 开始日期 | 日期时间 | 邮件接收或投递时间 |
| 最新进展记录 | 文本 | 邮件标题或招聘站时间线 |
| 待办状态 | 单选 | 待办、已完成、已忽略 |
| 完成时间 | 日期时间 | 待办完成时间 |
| 是否巡检 | 单选 | 是、否 |
| Cookie状态 | 单选 | 生效中、已过期、读取失败、未配置 |
| Cookie最近检测 | 日期时间 | 招聘站最近检测时间 |

公司主记录需要：

- `公司` 填写唯一、稳定的公司名。
- `父记录` 留空。
- 需要招聘站巡检时，将 `是否巡检` 设为“是”。

岗位、邮件待办和投递时间线使用子记录，`父记录` 指向对应公司主记录。

## 四、创建飞书自建应用

### 1. 创建应用

1. 打开[飞书开放平台开发者后台](https://open.feishu.cn/app)。
2. 创建“企业自建应用”。
3. 在“凭证与基础信息”复制：
   - App ID
   - App Secret

不要把 App Secret 提交到 GitHub、Issue、截图或聊天记录。

### 2. 开通权限

在应用的“权限管理”中搜索并开通：

```text
查看、评论、编辑和管理多维表格
```

对应权限标识为：

```text
bitable:app
```

插件使用应用身份 `tenant_access_token` 读取字段和记录，并创建、更新 Base 记录。
只读权限 `bitable:app:readonly` 不足以完成同步写入。

根据租户设置，权限变更后可能需要：

1. 创建应用版本。
2. 发布版本。
3. 等待企业管理员审核通过。

### 3. 将应用加入 Base 协作者

仅开通 API scope 还不够。应用还必须有目标 Base 的资源权限。

1. 打开目标多维表格。
2. 点击右上角“分享”。
3. 选择添加协作者或添加应用。
4. 搜索刚创建的自建应用。
5. 授予可编辑权限；若 Base 开启了高级权限，还需确认应用可读写目标表和字段。

飞书官方要求：使用 `tenant_access_token` 访问 Base 时，应用必须是该 Base 的
所有者或协作者。

## 五、获取 Base Token 和 Table ID

文件夹中的 Base URL 通常类似：

```text
https://example.feishu.cn/base/BASE_TOKEN?table=TABLE_ID&view=VIEW_ID
```

填写：

- Base Token：`/base/` 后、`?` 前的部分。
- Table ID：`table=` 后以 `tbl` 开头的部分。

必须选择包含“公司、岗位、进展、父记录”等字段的投递表，不要误填任务管理表或
仪表盘 ID。

如果 Base 位于知识库，浏览器地址中的 `/wiki/...` token 不是 Base Token。
建议先把模板导入到普通云空间，避免手工解析 Wiki 节点。

## 六、配置 AI 模型

邮件规则会先在本地过滤明显无关邮件。对需要补全公司、分类、链接或 DDL 的邮件，
插件会调用用户自己配置的 OpenAI-compatible API。

进入“设置 -> AI 模型版本”，至少启用一个模型并填写：

- API 地址
- 模型名
- API Key

未启用模型时，“立即同步”会拒绝启动。

## 七、在简填中保存配置

进入“设置”，依次填写：

### 邮箱

- 邮箱账号
- 客户端授权码
- IMAP 地址
- SSL 端口 `993`

### 飞书

- App ID
- App Secret
- Base Token
- Table ID

默认字段名与模板一致时，不需要修改“字段映射”。

### 同步

- 自动同步：按需开启。
- 自动同步间隔：默认 12 小时。
- 邮件捕捉周期：默认最近 24 小时。

点击“保存邮件设置”。

## 八、首次验收

1. 进入“邮件待办”。
2. 点击“测试连接”：
   - 通过只代表 Native Host 已正确安装。
3. 点击“立即同步”：
   - 验证 IMAP 授权码。
   - 验证 AI 模型。
   - 验证飞书 App ID、Secret、scope 和 Base 协作者权限。
4. 检查同步摘要和邮件历史。
5. 在飞书确认：
   - 明确测评、AI 面试或面试邀请生成子记录。
   - `父记录` 指向正确公司。
   - `note`、`测评链接`、`ddl`、`最新进展记录` 正确。

自动同步只在浏览器运行期间由扩展 alarm 触发，不是常驻云服务。

## 九、处理规则

会进入待办：

- 明确要求完成在线测评或笔试。
- 明确要求参加 AI 面试。
- 明确的面试邀约。
- 明确拒信或岗位关闭通知会标记公司进展并留痕。

默认忽略：

- 投递成功回执。
- 简历创建成功。
- 验证码。
- 招聘宣传、职位推荐、人才群邀请。

如果公司无法唯一匹配，邮件会进入“待确认”，不会随意写到某条公司记录。

## 十、常见错误

### 本地桥接未安装

- 重新确认扩展 ID。
- macOS 再运行 `./native-host/install.sh <扩展ID>`。
- Windows 再运行
  `powershell -ExecutionPolicy Bypass -File .\native-host\install-windows.ps1 -ExtensionId <扩展ID>`。
- 在 `chrome://extensions` 重新加载扩展。

### 邮箱提示账号或密码错误

- 密码必须是客户端授权码，不是网页登录密码。
- 126 使用 `imap.126.com`。
- 163 使用 `imap.163.com`。
- 账号必须包含完整后缀。
- 检查授权码前后是否带空格。
- 检查网易邮箱中 IMAP 是否仍开启。

### 飞书认证失败

- 检查 App ID 和 App Secret。
- 确认应用版本已经发布。
- 确认管理员已经批准新增权限。

### 飞书返回无权限

- 确认已开通 `bitable:app`。
- 确认自建应用已加入目标 Base 协作者。
- 若开启高级权限，确认应用拥有目标表和字段的读写权限。

### 找不到字段

- 对照“必需字段”检查精确字段名。
- 字段名区分字符、空格和大小写。
- 确认 Table ID 指向投递表。

### 同步后没有新记录

- 检查邮件是否处于捕捉周期内。
- 检查邮件是否属于明确行动邀请。
- 已处理邮件会在本机数据库中去重。
- 查看邮件历史中是否显示“已忽略”“待确认”或“失败”及其原因。

## 安全说明

- 邮箱授权码、飞书 Secret 和 AI Key 保存在当前浏览器本地。
- Native Host 通过标准输入输出与扩展通信，不监听网络端口。
- 完整邮件正文不会持久化到本地 SQLite。
- 只有疑似招聘行动邮件的正文会发送到用户自己配置的 AI 服务。
- 不要公开 `.env`、授权码、App Secret、API Key 或招聘站 Cookie。

## 官方参考

- [网易邮箱：如何开启客户端协议](http://help.mail.163.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305fa1ce630d7f67ac2a5feb28b66796d3b)
- [126 邮箱：如何新增授权码](https://help.mail.126.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305fa1ce630d7f67ac286624f309a1a7089)
- [飞书开放平台：多维表格概述与鉴权](https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview)
- [飞书开放平台：增加云文档协作者权限](https://open.feishu.cn/document/server-docs/docs/permission/permission-member/create)
