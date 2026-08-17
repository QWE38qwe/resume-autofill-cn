from __future__ import annotations

import getpass
import json
import os
import platform
import re
import subprocess
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

from .feishu import FeishuBaseClient, has_link_value, normalize_company


TRACKER_ROOT = Path(__file__).resolve().parents[2] / "tracker"


@dataclass(frozen=True)
class Channel:
    channel_id: str
    name: str
    company: str
    applications_url: str
    login_fragments: tuple[str, ...]
    item_selectors: tuple[str, ...]
    empty_selectors: tuple[str, ...]


@dataclass
class ChannelStatus:
    channel_id: str
    name: str
    company: str
    status: str
    detail: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


CHANNELS = (
    Channel(
        "bytedance",
        "字节跳动",
        "字节跳动",
        "https://jobs.bytedance.com/campus/position/application",
        ("/login", "sso.bytedance.com"),
        (
            '[data-testid*="application-item"]',
            '[class*="application-list"] [class*="item"]',
            '[class*="delivery"] [class*="card"]',
            '[class*="application-card"]',
        ),
        ("text=暂无应聘记录", '[class*="empty"]'),
    ),
    Channel(
        "baidu",
        "百度",
        "百度",
        "https://talent.baidu.com/jobs/center",
        ("/login", "passport.baidu.com"),
        (
            '[data-testid*="application-item"]',
            '[class*="delivery-record"] [class*="item"]',
            '[class*="application-list"] [class*="item"]',
            '[class*="job-card"]',
        ),
        (),
    ),
    Channel(
        "xiaomi_feishu",
        "小米",
        "小米",
        "https://xiaomi.jobs.f.mioffice.cn/internship/position/application",
        ("/login", "passport.feishu.cn", "passport.mioffice.cn"),
        (
            'text=投递简历',
            'text=评估中',
            'text=第 1 志愿',
            '[data-testid*="application-item"]',
            '[class*="application-list"] [class*="item"]',
            '[class*="delivery-list"] [class*="item"]',
            '[class*="application-card"]',
        ),
        ("text=暂无应聘记录", "text=暂无投递记录", '[class*="empty"]'),
    ),
    Channel(
        "shokz",
        "韶音科技",
        "韶音科技",
        "https://campus.shokz.com.cn/#/candidateHome/applications",
        ("/login", "/account"),
        (
            'div[class^="preference-"]:not([class*="bottom"]):has-text("状态:")',
            '[data-testid*="application-item"]',
            '[class*="application-list"] [class*="item"]',
            '[class*="delivery"] [class*="card"]',
            '[class*="application-card"]',
        ),
        ("text=暂无应聘记录", "text=暂无投递记录", '[class*="empty"]'),
    ),
    Channel(
        "nio_feishu",
        "蔚来",
        "蔚来",
        "https://nio.jobs.feishu.cn/campus/position/application",
        ("/login", "passport.feishu.cn"),
        (
            '[data-testid*="application-item"]',
            '[class*="application-list"] [class*="item"]',
            '[class*="delivery-list"] [class*="item"]',
            '[class*="application-card"]',
        ),
        ("text=暂无应聘记录", "text=暂无投递记录", '[class*="empty"]'),
    ),
    Channel(
        "jd",
        "京东",
        "京东",
        "https://campus.jd.com/#/myDeliver?type=present",
        ("/login", "passport.jd.com", "plogin"),
        (
            "text=网申投递",
            "text=投递详情",
            "text=简历筛选",
            '[class*="delivery"] [class*="item"]',
            '[class*="application"] [class*="item"]',
        ),
        ("text=暂无投递记录", "text=暂无应聘记录", '[class*="empty"]'),
    ),
    Channel(
        "pdd",
        "拼多多",
        "拼多多",
        "https://careers.pddglobalhr.com/campus/positions",
        ("/login", "passport", "auth"),
        ('[class*="application"] [class*="item"]', '[class*="delivery"] [class*="card"]'),
        ("text=暂无投递记录", "text=暂无应聘记录", '[class*="empty"]'),
    ),
    Channel(
        "oppo",
        "OPPO",
        "OPPO",
        "https://careers.oppo.com/university/position",
        ("/login", "passport", "auth"),
        ('[class*="application"] [class*="item"]', '[class*="delivery"] [class*="card"]'),
        ("text=暂无投递记录", "text=暂无应聘记录", '[class*="empty"]'),
    ),
    Channel(
        "iflytek",
        "科大讯飞",
        "科大讯飞",
        "https://campus.iflytek.com/#/candidateHome/application",
        ("/login", "passport", "auth"),
        ('[class*="application"] [class*="item"]', '[class*="delivery"] [class*="card"]'),
        ("text=暂无投递记录", "text=暂无应聘记录", '[class*="empty"]'),
    ),
)


class AuthStore:
    def __init__(self, directory: Path):
        self.directory = directory
        self.directory.mkdir(parents=True, exist_ok=True)

    def _path(self, channel_id: str) -> Path:
        safe = re.sub(r"[^A-Za-z0-9_-]", "", channel_id)
        return self.directory / f"{safe}.state.enc"

    def exists(self, channel_id: str) -> bool:
        return self._path(channel_id).exists()

    def _key(self) -> bytes:
        account = getpass.getuser()
        if platform.system() != "Darwin":
            raise RuntimeError("进展巡检当前仅支持 macOS Keychain 登录态")
        result = subprocess.run(
            [
                "security",
                "find-generic-password",
                "-s",
                "autotrack.playwright",
                "-a",
                account,
                "-w",
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError("未找到本机登录态密钥，请在此设备重新登录招聘网站")
        return result.stdout.strip().encode("ascii")

    def load(self, channel_id: str) -> dict[str, Any]:
        try:
            encrypted = self._path(channel_id).read_bytes()
            return json.loads(Fernet(self._key()).decrypt(encrypted).decode("utf-8"))
        except (InvalidToken, ValueError, json.JSONDecodeError) as error:
            raise RuntimeError("登录态无法解密，请重新登录招聘网站") from error

    def save(self, channel_id: str, state: dict[str, Any]) -> None:
        self._path(channel_id).write_bytes(
            Fernet(self._key()).encrypt(json.dumps(state).encode("utf-8"))
        )


def _matches_any(page: Any, selectors: tuple[str, ...]) -> bool:
    for selector in selectors:
        try:
            if page.locator(selector).count() > 0:
                return True
        except PlaywrightTimeout:
            continue
    return False


def check_channel(channel: Channel, auth_store: AuthStore) -> ChannelStatus:
    if not auth_store.exists(channel.channel_id):
        return ChannelStatus(
            channel.channel_id, channel.name, channel.company, "未配置", "尚未保存登录态"
        )

    try:
        state = auth_store.load(channel.channel_id)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(
                storage_state=state,
                locale="zh-CN",
                timezone_id="Asia/Shanghai",
                viewport={"width": 1440, "height": 1000},
            )
            page = context.new_page()
            page.goto(channel.applications_url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(2500)
            current_url = page.url.casefold()
            if any(fragment.casefold() in current_url for fragment in channel.login_fragments):
                return ChannelStatus(
                    channel.channel_id, channel.name, channel.company, "已过期", "招聘站跳转到登录页"
                )
            if current_url == "about:blank":
                return ChannelStatus(
                    channel.channel_id, channel.name, channel.company, "读取失败", "招聘站返回空白页面"
                )
            if _matches_any(page, channel.item_selectors) or _matches_any(
                page, channel.empty_selectors
            ):
                return ChannelStatus(
                    channel.channel_id, channel.name, channel.company, "生效中", "投递页可读取"
                )
            return ChannelStatus(
                channel.channel_id,
                channel.name,
                channel.company,
                "读取失败",
                "未识别投递记录结构，请手动查看",
            )
    except Exception as error:
        detail = str(error).splitlines()[0][:120]
        return ChannelStatus(
            channel.channel_id, channel.name, channel.company, "读取失败", detail or "巡检异常"
        )

def get_channel(channel_id: str) -> Channel:
    for channel in CHANNELS:
        if channel.channel_id == channel_id:
            return channel
    raise ValueError("不支持的招聘渠道")


def login_and_save(channel_id: str) -> None:
    """Open a dedicated headed browser. Saving occurs only after the user closes it."""
    channel = get_channel(channel_id)
    auth_store = AuthStore(TRACKER_ROOT / "state" / "auth")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=False)
        context = browser.new_context(locale="zh-CN", timezone_id="Asia/Shanghai")
        page = context.new_page()
        page.goto(channel.applications_url, wait_until="domcontentloaded", timeout=60000)
        try:
            # Keep a dedicated login window open long enough for an interactive
            # QR code, password, or captcha flow, then persist its storage state.
            page.wait_for_timeout(5 * 60 * 1000)
            auth_store.save(channel.channel_id, context.storage_state())
        finally:
            context.close()
            browser.close()


def start_login(channel_id: str) -> dict[str, str]:
    channel = get_channel(channel_id)
    subprocess.Popen(
        [sys.executable, "-m", "job_email_assistant.progress_login", channel.channel_id],
        start_new_session=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return {"ok": True, "channelId": channel.channel_id, "name": channel.name}


def save_chrome_cookies(channel_id: str, cookies: list[dict[str, Any]]) -> dict[str, Any]:
    channel = get_channel(channel_id)
    if not cookies:
        raise ValueError("未读取到登录会话，请先在当前 Chrome 标签页完成登录")
    normalized = []
    for cookie in cookies:
        same_site = str(cookie.get("sameSite") or "").lower()
        normalized.append({
            "name": str(cookie["name"]),
            "value": str(cookie["value"]),
            "domain": str(cookie["domain"]),
            "path": str(cookie.get("path") or "/"),
            "expires": float(cookie.get("expirationDate") or -1),
            "httpOnly": bool(cookie.get("httpOnly")),
            "secure": bool(cookie.get("secure")),
            "sameSite": {
                "no_restriction": "None",
                "lax": "Lax",
                "strict": "Strict",
            }.get(same_site, "Lax"),
        })
    AuthStore(TRACKER_ROOT / "state" / "auth").save(
        channel.channel_id, {"cookies": normalized, "origins": []}
    )
    return {"ok": True, "channelId": channel.channel_id, "name": channel.name, "cookies": len(normalized)}


def _monitor_enabled(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, list):
        return any(_monitor_enabled(item) for item in value)
    return str(value or "").strip().casefold() in {"是", "yes", "true", "1"}


def _link_from_record(record: Any, field_name: str) -> str:
    value = record.fields.get(field_name)
    if isinstance(value, dict):
        return str(value.get("link") or value.get("url") or "")
    return str(value or "") if isinstance(value, str) else ""


def enabled_channels(feishu: FeishuBaseClient, records: list[Any]) -> list[Channel]:
    enabled_companies = {
        normalize_company(str(record.fields.get(feishu.settings.feishu_company_field) or ""))
        for record in records
        if not has_link_value(record.fields.get(feishu.settings.feishu_parent_field))
        and _monitor_enabled(record.fields.get(feishu.settings.feishu_monitor_enabled_field))
    }
    return [
        channel for channel in CHANNELS
        if normalize_company(channel.company) in enabled_companies
    ]


def run_monitor(feishu: FeishuBaseClient, channel_id: str | None = None) -> dict[str, Any]:
    auth_store = AuthStore(TRACKER_ROOT / "state" / "auth")
    records = feishu.list_records()
    channels = enabled_channels(feishu, records)
    if channel_id:
        channel = get_channel(channel_id)
        if channel not in channels:
            raise ValueError("请先在飞书该公司主记录中将“是否巡检”设为“是”")
        channels = [channel]
    statuses = [check_channel(channel, auth_store) for channel in channels]
    checked_at = int(time.time() * 1000)
    updated = 0
    for channel_status in statuses:
        parents = feishu.find_company_parents(channel_status.company, records)
        for parent in parents:
            feishu.update_record_fields(
                parent,
                {
                    feishu.settings.feishu_cookie_status_field: channel_status.status,
                    feishu.settings.feishu_cookie_checked_at_field: checked_at,
                },
            )
            updated += 1
    channel_data = []
    for status in statuses:
        channel = get_channel(status.channel_id)
        channel_data.append({
            **status.to_dict(),
            "applicationUrl": channel.applications_url,
        })
    return {
        "ok": True,
        "updated": updated,
        "channels": channel_data,
    }
