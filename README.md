# 简填

简填是一个本地优先的 Chrome / Edge 网申辅助扩展，用于管理多版本简历并填写招聘网站表单。扩展不会自动保存、提交或投递，填写后仍需用户检查。

## 功能

- 管理个人资料、教育经历、项目、语言、技能、证书和简历版本。
- 支持一键填写（覆盖已有内容）和补充填写（仅填写空白项）。
- 支持教育、实习、项目、语言和奖项等重复记录。
- 支持原生控件及常见 React / Vue 组件、iframe 和开放 Shadow DOM。
- 支持 Ant Design、Element、iView、Phoenix、`sd-Select` 等组件。
- 支持 PDF、DOCX、TXT 和 Markdown 简历解析。
- 可选接入 DeepSeek 兼容 API，AI 只负责字段语义映射。
- 本地记录网申公司、链接、简历版本、时间和备注，可导出 CSV。

## 安装

1. 下载或克隆本仓库。
2. 打开 Chrome / Edge 扩展管理页。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择仓库根目录。

新安装不会预置任何个人资料。请先在管理台录入资料并创建简历版本。

## 使用

1. 在扩展管理页打开“简填”的详情页并进入扩展选项。
2. 维护个人资料、教育经历和简历版本。
3. 打开招聘网站的简历编辑或申请页面。
4. 在弹窗中选择简历版本。
5. 点击“补充填写”或“一键填写”。
6. 检查所有字段后，由用户自行保存或提交。

## 教育经历

教育经历会按学历层级推导最高学历：

`博士 > 硕士 / 研究生 > 本科 / 学士 > 大专 / 专科 > 高中 / 中专`

最高学历记录用于填写网页中的学校、专业、学历、学位、毕业时间等单值字段；重复教育经历仍按资料库顺序填写。

## AI 与隐私

- 个人资料、API Key、网申记录和规则保存在 `chrome.storage.local`。
- 字段语义映射只向用户配置的 AI 服务发送网页字段元数据和标准字段名称，不发送个人资料值。
- 使用“导入简历解析”时，所选简历文本会发送给用户配置的 AI 服务。
- 扩展不包含遥测、广告或第三方统计。
- 扩展不会自动点击保存、提交或投递。

详细说明见 [PRIVACY.md](PRIVACY.md)。

## 支持范围

项目包含通用 ATS 表单适配，并针对以下组件或布局做过兼容：

- 原生 input、textarea、select、radio、checkbox、date 和 month。
- 可搜索下拉、按钮组、地区选择器和年月拆分控件。
- Ant Design、Element、iView、Phoenix 和 `sd-Select`。
- iframe、开放 Shadow DOM、动态追加记录。
- “工作信息 N”等非标准重复经历布局。

招聘网站会持续更新 DOM。遇到问题时，请提交不含个人值的页面结构、字段名称、控件类型和复现步骤。

## 开发与检查

项目使用 Manifest V3 和原生 JavaScript，无构建步骤。

```bash
node --check background.js
node --check content.js
node --check manager.js
node --check popup.js
bash scripts/privacy-check.sh
```

## 安全

不要在 Issue、截图或日志中提交真实姓名、手机号、邮箱、证件号码、API Key 或完整简历。安全问题请参阅 [SECURITY.md](SECURITY.md)。

## 第三方组件

- [PDF.js](https://github.com/mozilla/pdf.js)，Apache-2.0。
- [fflate](https://github.com/101arrowz/fflate)，MIT。
- PDF.js 附带的 CMaps 与字体许可证保存在 `vendor/` 对应目录。

第三方许可证原文已保留在 `vendor/`。

## License

[MIT](LICENSE)
