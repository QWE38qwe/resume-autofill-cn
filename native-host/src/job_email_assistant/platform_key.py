from __future__ import annotations

import getpass
import platform
import subprocess
from pathlib import Path

from cryptography.fernet import Fernet


KEYCHAIN_SERVICE = "autotrack.playwright"
WINDOWS_KEY_FILE = ".auth-key.dpapi"


def load_or_create_key(directory: Path) -> bytes:
    directory.mkdir(parents=True, exist_ok=True)
    system = platform.system()
    if system == "Darwin":
        return _load_or_create_macos_key()
    if system == "Windows":
        return _load_or_create_windows_key(directory)
    raise RuntimeError("登录态加密仅支持 macOS Keychain 或 Windows DPAPI")


def _load_or_create_macos_key() -> bytes:
    account = getpass.getuser()
    existing = _read_keychain_key(account)
    if existing:
        return existing
    generated = Fernet.generate_key()
    if not _write_keychain_key(account, generated):
        raise RuntimeError(
            "无法在 macOS 钥匙串中创建登录态密钥，请检查钥匙串访问权限后重试"
        )
    return generated


def _read_keychain_key(account: str) -> bytes | None:
    result = subprocess.run(
        [
            "security",
            "find-generic-password",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            account,
            "-w",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    value = result.stdout.strip()
    return value.encode("ascii") if value else None


def _write_keychain_key(account: str, key: bytes) -> bool:
    result = subprocess.run(
        [
            "security",
            "add-generic-password",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            account,
            "-w",
            key.decode("ascii"),
            "-U",
        ],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def _load_or_create_windows_key(directory: Path) -> bytes:
    path = directory / WINDOWS_KEY_FILE
    if path.exists():
        try:
            key = _dpapi_unprotect(path.read_bytes())
            Fernet(key)
            return key
        except (OSError, ValueError):
            raise RuntimeError(
                "Windows 登录态密钥无法解密，请删除本机登录态后重新连接招聘网站"
            ) from None

    generated = Fernet.generate_key()
    protected = _dpapi_protect(generated)
    temp = path.with_suffix(".tmp")
    try:
        temp.write_bytes(protected)
        temp.replace(path)
    except OSError as error:
        temp.unlink(missing_ok=True)
        raise RuntimeError(
            "无法写入 Windows DPAPI 登录态密钥，请检查当前用户目录权限"
        ) from error
    return generated


def _dpapi_protect(value: bytes) -> bytes:
    return _dpapi_transform(value, protect=True)


def _dpapi_unprotect(value: bytes) -> bytes:
    return _dpapi_transform(value, protect=False)


def _dpapi_transform(value: bytes, protect: bool) -> bytes:
    if platform.system() != "Windows":
        raise OSError("Windows DPAPI is only available on Windows")

    import ctypes
    from ctypes import wintypes

    class DataBlob(ctypes.Structure):
        _fields_ = [
            ("cbData", wintypes.DWORD),
            ("pbData", ctypes.POINTER(ctypes.c_ubyte)),
        ]

    buffer = ctypes.create_string_buffer(value)
    input_blob = DataBlob(
        len(value),
        ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)),
    )
    output_blob = DataBlob()
    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    flags = 0x1  # CRYPTPROTECT_UI_FORBIDDEN
    blob_pointer = ctypes.POINTER(DataBlob)
    crypt32.CryptProtectData.argtypes = [
        blob_pointer,
        wintypes.LPCWSTR,
        blob_pointer,
        ctypes.c_void_p,
        ctypes.c_void_p,
        wintypes.DWORD,
        blob_pointer,
    ]
    crypt32.CryptProtectData.restype = wintypes.BOOL
    crypt32.CryptUnprotectData.argtypes = [
        blob_pointer,
        ctypes.POINTER(wintypes.LPWSTR),
        blob_pointer,
        ctypes.c_void_p,
        ctypes.c_void_p,
        wintypes.DWORD,
        blob_pointer,
    ]
    crypt32.CryptUnprotectData.restype = wintypes.BOOL
    kernel32.LocalFree.argtypes = [ctypes.c_void_p]
    kernel32.LocalFree.restype = ctypes.c_void_p

    if protect:
        ok = crypt32.CryptProtectData(
            ctypes.byref(input_blob),
            "Jianfill Native Host",
            None,
            None,
            None,
            flags,
            ctypes.byref(output_blob),
        )
    else:
        ok = crypt32.CryptUnprotectData(
            ctypes.byref(input_blob),
            None,
            None,
            None,
            None,
            flags,
            ctypes.byref(output_blob),
        )
    if not ok:
        raise OSError(ctypes.get_last_error(), "Windows DPAPI operation failed")
    try:
        return ctypes.string_at(output_blob.pbData, output_blob.cbData)
    finally:
        kernel32.LocalFree(ctypes.cast(output_blob.pbData, ctypes.c_void_p))
