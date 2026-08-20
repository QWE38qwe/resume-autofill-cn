param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-p]{32}$')]
    [string]$ExtensionId
)

$ErrorActionPreference = "Stop"
$HostName = "cn.local.jianfill.mail"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallRoot = Join-Path $env:LOCALAPPDATA "Jianfill\MailHost"
$SourceTarget = Join-Path $InstallRoot "src"

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    throw "未找到 uv。请先安装：https://docs.astral.sh/uv/getting-started/installation/"
}

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
if (Test-Path $SourceTarget) {
    Remove-Item -Recurse -Force $SourceTarget
}
Copy-Item -Recurse -Force (Join-Path $Root "src") $SourceTarget
Copy-Item -Force (Join-Path $Root "pyproject.toml") $InstallRoot
Copy-Item -Force (Join-Path $Root "uv.lock") $InstallRoot

$EnvSource = Join-Path $Root ".env"
if (Test-Path $EnvSource) {
    Copy-Item -Force $EnvSource (Join-Path $InstallRoot ".env")
}

Push-Location $InstallRoot
try {
    & uv sync --frozen
    if ($LASTEXITCODE -ne 0) {
        throw "uv sync 执行失败"
    }
    & uv run playwright install chromium
    if ($LASTEXITCODE -ne 0) {
        throw "Playwright Chromium 安装失败"
    }
}
finally {
    Pop-Location
}

$HostExecutable = Join-Path $InstallRoot ".venv\Scripts\jianfill-mail-host.exe"
if (-not (Test-Path $HostExecutable)) {
    throw "未生成 Native Host 启动器：$HostExecutable"
}

$ManifestPath = Join-Path $InstallRoot "$HostName.json"
$Manifest = [ordered]@{
    name = $HostName
    description = "简填邮件待办本地桥接"
    path = $HostExecutable
    type = "stdio"
    allowed_origins = @("chrome-extension://$ExtensionId/")
}
$ManifestJson = $Manifest | ConvertTo-Json -Depth 4
$Utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($ManifestPath, $ManifestJson, $Utf8WithoutBom)

$RegistryTargets = @(
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName",
    "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
)
foreach ($RegistryPath in $RegistryTargets) {
    New-Item -Force -Path $RegistryPath | Out-Null
    Set-Item -Path $RegistryPath -Value $ManifestPath
}

Write-Host "Native Host Windows 安装完成。"
Write-Host "运行目录：$InstallRoot"
Write-Host "密钥保护：当前 Windows 用户 DPAPI"
Write-Host "请在扩展管理页重新加载简填，再到邮件待办测试连接。"
