# 跨设备复用招聘网站登录态

## 结论

当前版本不会把 Cookie、招聘网站登录态、Keychain 密钥或 DPAPI 密钥同步到
`chrome.storage.sync`、Google 账号或 Git。

每台设备都需要单独在招聘网站完成一次登录，然后由“简填”的本地巡检功能保存
加密登录态。扩展会在飞书多维表格的 `Cookie状态` 字段提示可用情况。

## 为什么不能直接复制 Chrome Cookie

- Chrome Cookie 通常受本机系统加密保护，直接复制 Cookie 数据库到另一台设备通常无法使用。
- macOS 登录态文件依赖本机 Keychain；Windows 登录态文件依赖当前用户 DPAPI。
  两者都不能通过复制密文文件在另一台设备解密。
- 直接同步明文 Cookie 会使招聘网站会话在多个设备暴露，失效和排查都更困难。

## 新设备操作步骤

1. 安装简填扩展，并在 `chrome://extensions` 重新加载。
2. 运行一次本地桥接安装。macOS：

   ```bash
   ./native-host/install.sh <扩展ID>
   ```

   Windows PowerShell：

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\native-host\install-windows.ps1 -ExtensionId <扩展ID>
   ```

3. 在新设备浏览器中打开每个招聘网站并手动登录。
   验证码、扫码、滑块等必须由本人完成。
4. 在简填“投递进展”页点击“① 登录”，完成登录后点击“② 连接并验证”。
   登录态会被加密保存在对应系统的 Native Host 运行目录：

   ```text
   macOS:
   ~/Library/Application Support/Jianfill Mail Host/tracker/state/auth/

   Windows:
   %LOCALAPPDATA%\Jianfill\MailHost\tracker\state\auth\
   ```

5. 打开扩展的“投递进展”页，点击“立即巡检”。
6. 查看飞书多维表格中的 `Cookie状态`：

   - `生效中`：登录态和投递页均可读取。
   - `已过期`：招聘站要求重新登录。
   - `读取失败`：登录态存在，但页面结构、网络或站点策略导致无法读取；手动查看投递进展。
   - `未配置`：此设备尚未保存该渠道登录态。

扩展会在当前 Chrome Profile 打开
招聘网站，因此可以使用浏览器已保存的密码自动填充。完成登录后回到扩展点击
“② 连接并验证”。密码本身不会被扩展读取。

## 其他设备 AI 的操作边界

可以让其他设备上的 AI 工具协助：

- 安装本地桥接。
- 读取不含凭据的巡检结果。
- 提醒需要重新登录的渠道。
- 调试页面选择器或渠道适配器。

不要让任何工具：

- 输出、上传或提交 Cookie、Storage State、邮箱授权码、飞书密钥、API Key。
- 复制 macOS Keychain 或 Windows DPAPI 密钥内容。
- 绕过招聘网站验证码、扫码或滑块。

## 后续可选方案

若确实需要减少跨设备重复登录，可在后续版本设计“用户设置密码的加密备份包”：

1. 使用独立密码派生密钥加密登录态。
2. 仅同步密文，不同步 Keychain 密钥和明文 Cookie。
3. 新设备下载后必须输入同一密码解密。
4. 每次导入后仍执行“立即巡检”，以确认招聘站是否接受该会话。

该方案需要单独设计密码恢复、失效、撤销和同步存储策略，不属于当前 MVP。

## 状态轮询

默认每 12 小时自动巡检一次，也可在“投递进展”页调整或关闭自动巡检。
每次巡检真实打开投递页后，都会更新 `Cookie状态` 和 `Cookie最近检测`。
`生效中` 仅表示该检测时间点页面可读；判断是否仍然可信时，应同时查看
`Cookie最近检测` 是否足够新。

只有飞书公司主记录中 `是否巡检` 设为 `是` 的公司会出现在扩展投递进展表格中，
并参与手动或自动巡检。
