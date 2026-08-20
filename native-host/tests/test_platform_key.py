from cryptography.fernet import Fernet
import pytest

from job_email_assistant import platform_key


def test_rejects_unsupported_platform(monkeypatch, tmp_path):
    monkeypatch.setattr(platform_key.platform, "system", lambda: "Linux")

    with pytest.raises(RuntimeError, match="macOS Keychain 或 Windows DPAPI"):
        platform_key.load_or_create_key(tmp_path)


def test_macos_reuses_existing_key(monkeypatch, tmp_path):
    key = Fernet.generate_key()
    monkeypatch.setattr(platform_key.platform, "system", lambda: "Darwin")
    monkeypatch.setattr(platform_key, "_read_keychain_key", lambda _: key)
    monkeypatch.setattr(
        platform_key,
        "_write_keychain_key",
        lambda *_: pytest.fail("existing key should be reused"),
    )

    assert platform_key.load_or_create_key(tmp_path) == key


def test_windows_creates_dpapi_protected_key(monkeypatch, tmp_path):
    monkeypatch.setattr(platform_key.platform, "system", lambda: "Windows")
    monkeypatch.setattr(platform_key, "_dpapi_protect", lambda value: b"dpapi:" + value)

    key = platform_key.load_or_create_key(tmp_path)

    Fernet(key)
    assert (tmp_path / platform_key.WINDOWS_KEY_FILE).read_bytes() == b"dpapi:" + key


def test_windows_reuses_dpapi_protected_key(monkeypatch, tmp_path):
    key = Fernet.generate_key()
    path = tmp_path / platform_key.WINDOWS_KEY_FILE
    path.write_bytes(b"protected")
    monkeypatch.setattr(platform_key.platform, "system", lambda: "Windows")
    monkeypatch.setattr(
        platform_key,
        "_dpapi_unprotect",
        lambda value: key if value == b"protected" else b"",
    )

    assert platform_key.load_or_create_key(tmp_path) == key


def test_windows_rejects_unreadable_existing_key(monkeypatch, tmp_path):
    path = tmp_path / platform_key.WINDOWS_KEY_FILE
    path.write_bytes(b"protected")
    monkeypatch.setattr(platform_key.platform, "system", lambda: "Windows")
    monkeypatch.setattr(
        platform_key,
        "_dpapi_unprotect",
        lambda _: (_ for _ in ()).throw(OSError("invalid")),
    )

    with pytest.raises(RuntimeError, match="Windows 登录态密钥无法解密"):
        platform_key.load_or_create_key(tmp_path)
