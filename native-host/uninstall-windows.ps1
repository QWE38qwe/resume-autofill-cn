param(
    [switch]$RemoveData
)

$ErrorActionPreference = "Stop"
$HostName = "cn.local.jianfill.mail"
$InstallRoot = Join-Path $env:LOCALAPPDATA "Jianfill\MailHost"
$RegistryTargets = @(
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName",
    "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
)

foreach ($RegistryPath in $RegistryTargets) {
    if (Test-Path $RegistryPath) {
        Remove-Item -Recurse -Force $RegistryPath
    }
}

if ($RemoveData -and (Test-Path $InstallRoot)) {
    Remove-Item -Recurse -Force $InstallRoot
    Write-Host "Native Host 已卸载，本地数据已删除。"
}
else {
    Write-Host "Native Host 已从 Chrome / Edge 注销。"
    Write-Host "本地数据仍保留在：$InstallRoot"
    Write-Host "如需一并删除，请运行：.\native-host\uninstall-windows.ps1 -RemoveData"
}
