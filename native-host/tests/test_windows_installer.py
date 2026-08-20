from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_windows_installer_registers_chrome_and_edge():
    script = (ROOT / "install-windows.ps1").read_text(encoding="utf-8")

    assert 'Join-Path $env:LOCALAPPDATA "Jianfill\\MailHost"' in script
    assert ".venv\\Scripts\\jianfill-mail-host.exe" in script
    assert "Google\\Chrome\\NativeMessagingHosts" in script
    assert "Microsoft\\Edge\\NativeMessagingHosts" in script
    assert 'allowed_origins = @("chrome-extension://$ExtensionId/")' in script
    assert "ConvertTo-Json" in script
    assert "uv run playwright install chromium" in script


def test_windows_uninstaller_preserves_data_by_default():
    script = (ROOT / "uninstall-windows.ps1").read_text(encoding="utf-8")

    assert "[switch]$RemoveData" in script
    assert "if ($RemoveData" in script
    assert "本地数据仍保留" in script
