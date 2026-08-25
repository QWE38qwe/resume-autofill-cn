from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, asdict, field
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from cryptography.fernet import Fernet, InvalidToken
from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

from .feishu import BaseRecord, FeishuBaseClient, has_link_value, normalize_company
from .platform_key import load_or_create_key


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
    job_progress: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
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
        "https://careers.pddglobalhr.com/campus/personal-center",
        ("/login", "passport", "auth"),
        (
            "text=应聘状态",
            "text=当前状态",
            "text=当前应聘职位",
            '[class*="application"] [class*="item"]',
            '[class*="delivery"] [class*="card"]',
        ),
        ("text=暂无投递记录", "text=暂无应聘记录", '[class*="empty"]'),
    ),
    Channel(
        "oppo",
        "OPPO",
        "OPPO",
        "https://careers.oppo.com/university/oppo/center/history",
        ("/login", "passport", "auth"),
        (
            "text=应聘记录",
            "text=投递记录",
            '[class*="application"] [class*="item"]',
            '[class*="delivery"] [class*="card"]',
        ),
        ("text=暂无投递记录", "text=暂无应聘记录", '[class*="empty"]'),
    ),
    Channel(
        "iflytek",
        "科大讯飞",
        "科大讯飞",
        "https://iflytek.zhiye.com/personal/deliveryRecord",
        ("/login", "passport", "auth"),
        (
            "text=投递记录",
            "text=应聘记录",
            '[class*="application"] [class*="item"]',
            '[class*="delivery"] [class*="card"]',
        ),
        ("text=暂无投递记录", "text=暂无应聘记录", '[class*="empty"]'),
    ),
    Channel(
        "kuaishou",
        "快手",
        "快手",
        "https://campus.kuaishou.cn/recruit/campus/e/#/campus/my-apply",
        ("/campus/login", "/login"),
        (
            "text=投递记录",
            "text=简历投递",
            "text=笔试",
            "text=面试",
            '[class*="apply-list"]',
            '[class*="application"] [class*="item"]',
        ),
        ("text=暂无记录", "text=暂无投递记录", '[class*="empty"]'),
    ),
)


# 这些渠道在无头浏览器里无法可靠还原登录态：百度即使 Cookie 齐全也会被反爬拦到
# about:blank 空白页；OPPO 的登录 token 不在可导出的 Cookie / localStorage 中，
# 还原后必然跳登录页误判“已过期”。它们改由扩展读取用户已登录的 Chrome 标签页，
# 无头巡检时跳过，避免把状态误写成“已过期 / 空白页”。
CHROME_ONLY_CHANNEL_IDS = frozenset({"baidu", "oppo"})


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
        return load_or_create_key(self.directory)

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


def _settle_page(page: Any, selectors: tuple[str, ...], timeout_ms: int = 12000) -> None:
    """等待 SPA 真正渲染完：先等网络空闲，再轮询关键元素/空态出现。

    投递页多为前端渲染，domcontentloaded 后 DOM 往往还是空壳；固定 sleep 会误判
    “空白页 / 结构未识别”。这里以关键元素出现为准，最多等 timeout_ms。
    """
    try:
        page.wait_for_load_state("networkidle", timeout=timeout_ms)
    except PlaywrightTimeout:
        pass
    if not selectors:
        page.wait_for_timeout(1500)
        return
    deadline = time.monotonic() + timeout_ms / 1000
    while time.monotonic() < deadline:
        if _matches_any(page, selectors):
            return
        # 已跳到登录页就无需继续等待，交给上层判定“已过期”。
        if any(fragment.casefold() in page.url.casefold() for fragment in ("/login", "passport", "/account", "sso")):
            return
        page.wait_for_timeout(500)


def _normalize_job_name(value: str) -> str:
    value = re.sub(r"^\d+届(?:提前批|校招|春招)?[-\s]*", "", value)
    return re.sub(r"[\s\-—_（）()]+", "", value).casefold()


def _field_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "".join(
            str(item.get("text") or "") if isinstance(item, dict) else str(item)
            for item in value
        )
    return str(value) if value is not None else ""


def _shokz_job_progress(page: Any) -> list[dict[str, str]]:
    text = page.locator("body").inner_text()
    jobs: list[dict[str, str]] = []
    pattern = re.compile(
        r"第\s*(?P<priority>\d+)\s*志愿\s*\n"
        r"(?P<job>[^\n]+).*?"
        r"状态:\s*\n(?P<status>[^\n]+)\s*\n项目:",
        re.DOTALL,
    )
    for match in pattern.finditer(text):
        raw_status = match.group("status").strip()
        jobs.append(
            {
                "priority": match.group("priority"),
                "job": match.group("job").strip(),
                "status": "已挂" if raw_status == "暂不匹配" else raw_status,
                "source_status": raw_status,
            }
        )
    return jobs


XIAOMI_PROGRESS_MAP = {
    "投递简历": "已投递",
    "评估中": "初筛",
    "面试中": "待面试",
    "面试": "待面试",
    "笔试中": "待笔试",
    "笔试": "待笔试",
    "不合适": "已挂",
    "暂不匹配": "已挂",
}

PROGRESS_RANK = {
    "待投递": 0,
    "还没开始": 0,
    "已投递": 1,
    "初筛": 2,
    "待笔试": 3,
    "已笔试": 4,
    "待面试": 5,
    "已挂": -1,
}


def _date_timestamp(value: str) -> int | None:
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d").replace(
            tzinfo=ZoneInfo("Asia/Shanghai")
        )
    except ValueError:
        return None
    return int(parsed.timestamp() * 1000)


def _xiaomi_job_progress(page: Any) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    cards = page.locator("div.applicationListItem")
    for index in range(cards.count()):
        card = cards.nth(index)
        lines = [
            line.strip()
            for line in card.inner_text().splitlines()
            if line.strip()
        ]
        if not lines:
            continue
        header = lines[0]
        header_match = re.match(
            r"^(?P<job>.+?)第\s*(?P<priority>\d+)\s*志愿$", header
        )
        if not header_match:
            continue

        events: list[tuple[str, str]] = []
        for line_index, line in enumerate(lines):
            if (
                line_index > 0
                and re.fullmatch(r"\d{4}-\d{2}-\d{2}", line)
            ):
                events.append((lines[line_index - 1], line))
        if not events:
            continue

        raw_status, latest_date = events[-1]
        status = XIAOMI_PROGRESS_MAP.get(raw_status, "已投递")
        city = ""
        try:
            city_index = lines.index("意向城市：")
            city_candidates = [
                item for item in lines[city_index + 1 :] if not item.isdigit()
            ]
            city = city_candidates[0] if city_candidates else ""
        except ValueError:
            pass

        source = lines[1] if len(lines) > 1 else ""
        project = lines[2] if len(lines) > 2 else ""
        event_summary = " → ".join(f"{name} {date}" for name, date in events)
        jobs.append(
            {
                "priority": header_match.group("priority"),
                "job": header_match.group("job").strip(),
                "status": status,
                "source_status": raw_status,
                "latest_date": latest_date,
                "started_at": _date_timestamp(events[0][1]),
                "city": city,
                "source": source,
                "project": project,
                "event_summary": event_summary,
            }
        )
    return jobs


def _matching_job_records(
    records: list[Any], company: str, job_name: str, feishu: FeishuBaseClient
) -> list[Any]:
    source_name = _normalize_job_name(job_name)
    company_name = normalize_company(company)
    children = [
        record
        for record in records
        if has_link_value(record.fields.get(feishu.settings.feishu_parent_field))
        and normalize_company(
            str(record.fields.get(feishu.settings.feishu_company_field) or "")
        )
        == company_name
    ]
    exact = [
        record
        for record in children
        if _normalize_job_name(
            str(record.fields.get(feishu.settings.feishu_position_field) or "")
        )
        == source_name
    ]
    if exact:
        return exact
    fuzzy: list[Any] = []
    for record in children:
        candidate_name = _normalize_job_name(
            str(record.fields.get(feishu.settings.feishu_position_field) or "")
        )
        if (
            source_name
            and candidate_name
            and (candidate_name in source_name or source_name in candidate_name)
        ):
            fuzzy.append(record)
    return fuzzy


def _sync_xiaomi_job_progress(
    feishu: FeishuBaseClient,
    records: list[Any],
    job_progress: list[dict[str, Any]],
) -> int:
    parents = feishu.find_company_parents("小米", records)
    if len(parents) != 1:
        return 0
    parent = parents[0]
    updated = 0

    for job in job_progress:
        matches = _matching_job_records(records, "小米", str(job["job"]), feishu)
        next_fields: dict[str, Any] = {
            feishu.settings.feishu_progress_field: job["status"],
            feishu.settings.feishu_subject_field: job["event_summary"],
        }
        if len(matches) == 1:
            record = matches[0]
            if not record.fields.get(feishu.settings.feishu_received_at_field):
                next_fields[feishu.settings.feishu_received_at_field] = job["started_at"]
            if all(
                _field_text(record.fields.get(name)) == _field_text(value)
                for name, value in next_fields.items()
                if value is not None
            ):
                continue
            feishu.update_record_fields(
                record,
                {name: value for name, value in next_fields.items() if value is not None},
            )
            updated += 1
            continue
        if matches:
            continue

        note_parts = [
            f"第 {job['priority']} 志愿",
            str(job.get("city") or ""),
            str(job.get("project") or ""),
            str(job.get("source") or ""),
        ]
        fields: dict[str, Any] = {
            feishu.settings.feishu_company_field: "小米",
            feishu.settings.feishu_position_field: job["job"],
            feishu.settings.feishu_progress_field: job["status"],
            feishu.settings.feishu_parent_field: [parent.record_id],
            feishu.settings.feishu_subject_field: job["event_summary"],
            feishu.settings.feishu_note_field: " | ".join(
                part for part in note_parts if part
            ),
        }
        if job.get("started_at") is not None:
            fields[feishu.settings.feishu_received_at_field] = job["started_at"]
        new_record_id = feishu.create_record_fields(fields)
        if new_record_id:
            records.append(BaseRecord(new_record_id, fields))
            updated += 1

    active_statuses = [
        str(job["status"])
        for job in job_progress
        if str(job["status"]) != "已挂"
    ]
    if active_statuses:
        summary_status = max(
            active_statuses, key=lambda status: PROGRESS_RANK.get(status, 0)
        )
        if _field_text(
            parent.fields.get(feishu.settings.feishu_progress_field)
        ) != summary_status:
            feishu.update_record_fields(
                parent, {feishu.settings.feishu_progress_field: summary_status}
            )
            updated += 1
    return updated


def _channel_job_progress(channel_id: str, page: Any) -> list[dict[str, Any]]:
    if channel_id == "shokz":
        return _shokz_job_progress(page)
    if channel_id == "xiaomi_feishu":
        return _xiaomi_job_progress(page)
    return []


def _sync_shokz_job_progress(
    feishu: FeishuBaseClient, records: list[Any], job_progress: list[dict[str, str]]
) -> int:
    children = [
        record
        for record in records
        if has_link_value(record.fields.get(feishu.settings.feishu_parent_field))
        and normalize_company(
            str(record.fields.get(feishu.settings.feishu_company_field) or "")
        )
        == normalize_company("韶音科技")
    ]
    updated = 0
    for job in job_progress:
        source_name = _normalize_job_name(job["job"])
        matches = []
        for record in children:
            candidate_name = _normalize_job_name(
                str(
                    record.fields.get(feishu.settings.feishu_position_field)
                    or ""
                )
            )
            if (
                source_name
                and candidate_name
                and (
                    candidate_name in source_name
                    or source_name in candidate_name
                )
            ):
                matches.append(record)
        if len(matches) != 1:
            continue
        record = matches[0]
        next_fields = {
            feishu.settings.feishu_progress_field: job["status"],
        }
        if _field_text(
            record.fields.get(feishu.settings.feishu_progress_field)
        ) == str(job["status"]):
            continue
        feishu.update_record_fields(record, next_fields)
        updated += 1
    return updated


def check_channel(channel: Channel, auth_store: AuthStore) -> ChannelStatus:
    if channel.channel_id in CHROME_ONLY_CHANNEL_IDS:
        # 交由扩展从已登录的 Chrome 标签页读取（recordVisibleProgress），
        # 无头巡检不去碰它，以免把已生效的状态误判为“已过期 / 空白页”。
        return ChannelStatus(
            channel.channel_id,
            channel.name,
            channel.company,
            "需在Chrome核对",
            "该站点无法无头巡检，请在已登录的 Chrome 标签页点“② 连接并验证”读取状态",
        )
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
            # 等 SPA 真正渲染出投递记录或空态，避免固定 sleep 造成的“空白页”误判。
            settle_targets = channel.item_selectors + channel.empty_selectors
            _settle_page(page, settle_targets)
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
                    channel.channel_id,
                    channel.name,
                    channel.company,
                    "生效中",
                    "投递页可读取",
                    _channel_job_progress(channel.channel_id, page),
                )
            # 页面渲染出了正文但没命中已知结构：区分“真空白”与“结构变化”，给出可操作提示。
            body_text = ""
            try:
                body_text = page.locator("body").inner_text(timeout=3000).strip()
            except Exception:
                body_text = ""
            if len(body_text) < 20:
                return ChannelStatus(
                    channel.channel_id, channel.name, channel.company, "读取失败", "招聘站返回空白页面"
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
    process_options: dict[str, Any] = {
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
    }
    if os.name == "nt":
        process_options["creationflags"] = (
            subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        )
    else:
        process_options["start_new_session"] = True
    subprocess.Popen(
        [sys.executable, "-m", "job_email_assistant.progress_login", channel.channel_id],
        **process_options,
    )
    return {"ok": True, "channelId": channel.channel_id, "name": channel.name}


def save_chrome_cookies(
    channel_id: str,
    cookies: list[dict[str, Any]],
    storage: dict[str, Any] | None = None,
) -> dict[str, Any]:
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
    origins = _build_origins(storage)
    auth_store = AuthStore(TRACKER_ROOT / "state" / "auth")
    auth_store.save(
        channel.channel_id, {"cookies": normalized, "origins": origins}
    )
    return {
        "ok": True,
        "channelId": channel.channel_id,
        "name": channel.name,
        "cookies": len(normalized),
        "storageKeys": sum(len(o.get("localStorage", [])) for o in origins),
    }


def _build_origins(storage: dict[str, Any] | None) -> list[dict[str, Any]]:
    """把浏览器读到的 localStorage/sessionStorage 转成 Playwright storage_state 的 origins。

    Playwright 只持久化 localStorage；sessionStorage 无法通过 storage_state 恢复，
    这里合并进 localStorage 尽量保留 token（多数把 token 放 localStorage 的站可直接生效）。
    """
    if not isinstance(storage, dict):
        return []
    origin = str(storage.get("origin") or "").strip()
    if not origin:
        return []
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for bucket in ("localStorage", "sessionStorage"):
        for entry in storage.get(bucket) or []:
            if not isinstance(entry, dict):
                continue
            name = str(entry.get("name") or "")
            if not name or name in seen:
                continue
            seen.add(name)
            items.append({"name": name, "value": str(entry.get("value") or "")})
    if not items:
        return []
    return [{"origin": origin, "localStorage": items}]


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


def _enabled_parent_records(
    feishu: FeishuBaseClient, records: list[Any]
) -> list[Any]:
    return [
        record
        for record in records
        if not has_link_value(record.fields.get(feishu.settings.feishu_parent_field))
        and _monitor_enabled(record.fields.get(feishu.settings.feishu_monitor_enabled_field))
    ]


def enabled_channels(feishu: FeishuBaseClient, records: list[Any]) -> list[Channel]:
    enabled_companies = {
        normalize_company(
            _field_text(record.fields.get(feishu.settings.feishu_company_field))
        )
        for record in _enabled_parent_records(feishu, records)
    }
    return [
        channel for channel in CHANNELS
        if normalize_company(channel.company) in enabled_companies
    ]


def _unsupported_enabled_channel_data(
    feishu: FeishuBaseClient, records: list[Any]
) -> list[dict[str, Any]]:
    supported_companies = {
        normalize_company(channel.company)
        for channel in CHANNELS
    }
    result = []
    for record in _enabled_parent_records(feishu, records):
        company = _field_text(
            record.fields.get(feishu.settings.feishu_company_field)
        ).strip()
        if not company or normalize_company(company) in supported_companies:
            continue
        result.append({
            **ChannelStatus(
                f"base_{record.record_id}",
                company,
                company,
                "暂不支持",
                "已同步巡检开关，当前版本暂无自动巡检适配",
            ).to_dict(),
            "applicationUrl": "",
            "supported": False,
        })
    return result


def list_enabled_channel_statuses(
    feishu: FeishuBaseClient,
    auth_store: AuthStore | None = None,
) -> dict[str, Any]:
    records = feishu.list_records()
    channels = enabled_channels(feishu, records)
    store = auth_store or AuthStore(TRACKER_ROOT / "state" / "auth")
    channel_data = []
    for channel in channels:
        parents = feishu.find_company_parents(channel.company, records)
        stored_status = ""
        if parents:
            stored_status = _field_text(
                parents[0].fields.get(feishu.settings.feishu_cookie_status_field)
            ).strip()
        if channel.channel_id in CHROME_ONLY_CHANNEL_IDS:
            status = stored_status or "需在Chrome核对"
            detail = "需在已登录的 Chrome 标签页核对"
        elif not store.exists(channel.channel_id):
            status = "未配置"
            detail = "已开启巡检，尚未保存登录态"
        else:
            status = stored_status or "待读取"
            detail = "已同步飞书巡检配置"
        channel_data.append({
            **ChannelStatus(
                channel.channel_id,
                channel.name,
                channel.company,
                status,
                detail,
            ).to_dict(),
            "applicationUrl": channel.applications_url,
            "supported": True,
        })
    channel_data.extend(_unsupported_enabled_channel_data(feishu, records))
    return {
        "ok": True,
        "channels": channel_data,
    }


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
        # Chrome-only 渠道由扩展侧的可见巡检回写真实状态，无头这一路不写飞书，
        # 免得用一个占位状态覆盖掉用户在 Chrome 里刚核对出来的“生效中”。
        if channel_status.channel_id in CHROME_ONLY_CHANNEL_IDS:
            continue
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
        if channel_status.channel_id == "shokz":
            updated += _sync_shokz_job_progress(
                feishu, records, channel_status.job_progress
            )
        if channel_status.channel_id == "xiaomi_feishu":
            updated += _sync_xiaomi_job_progress(
                feishu, records, channel_status.job_progress
            )
    channel_data = []
    for status in statuses:
        channel = get_channel(status.channel_id)
        channel_data.append({
            **status.to_dict(),
            "applicationUrl": channel.applications_url,
            "supported": True,
        })
    if not channel_id:
        channel_data.extend(_unsupported_enabled_channel_data(feishu, records))
    return {
        "ok": True,
        "updated": updated,
        "channels": channel_data,
    }


def record_visible_status(
    feishu: FeishuBaseClient, channel_id: str, status: str, detail: str
) -> dict[str, Any]:
    channel = get_channel(channel_id)
    records = feishu.list_records()
    if channel not in enabled_channels(feishu, records):
        raise ValueError("请先在飞书该公司主记录中将“是否巡检”设为“是”")
    checked_at = int(time.time() * 1000)
    parents = feishu.find_company_parents(channel.company, records)
    for parent in parents:
        feishu.update_record_fields(
            parent,
            {
                feishu.settings.feishu_cookie_status_field: status,
                feishu.settings.feishu_cookie_checked_at_field: checked_at,
            },
        )
    return {
        "ok": True,
        "updated": len(parents),
        "channels": [{
            **ChannelStatus(channel.channel_id, channel.name, channel.company, status, detail).to_dict(),
            "applicationUrl": channel.applications_url,
        }],
    }
