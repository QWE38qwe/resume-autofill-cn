from __future__ import annotations

import json
import re
import time
from datetime import datetime, timedelta
from typing import Any

import dateparser
import httpx

from .config import Settings
from .models import Extraction, ParsedEmail

CATEGORIES = {"在线测评", "ai面试", "面试邀约"}
IGNORE_SUBJECT_CUES = (
    "投递成功",
    "投递确认",
    "投递",
    "简历创建成功",
    "简历已创建",
    "简历已收到",
    "注册成功",
    "验证码",
    "校招启动",
    "招聘开启",
    "职位推荐",
    "投递简历",
    "就业群",
    "人才群",
)
URL_RE = re.compile(r"https?://[^\s<>\"]+")
ABSOLUTE_DATE_RE = re.compile(
    r"(\d{4})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})\s*日?"
    r"(?:\s*[T]?\s*(\d{1,2})\s*[：:]\s*(\d{2}))?"
)
DURATION_RE = re.compile(
    r"(?:有效期(?:为)?|收到(?:本)?邮件后|自邮件发送(?:起|后)?|请在)"
    r"\s*(\d+)\s*(小时|天)(?:内|之内|有效)?"
)
DEADLINE_CONTEXT_RE = re.compile(
    r"(?:截止(?:时间|日期)?|请于|请在|有效期(?:至|到)|最晚于|"
    r"到期(?:时间)?|须在|需在|务必(?:于|在)?)"
    r"\s*[：:]?\s*([^\n。；;]{2,60})",
    re.I,
)
GENERIC_COMPANY_LABELS = {
    "51job",
    "careers",
    "career",
    "jobs",
    "campus",
    "italent",
    "mail",
    "service",
    "usermail",
    "校招投递邀请",
    "校园招聘",
    "招聘",
    "测评通知",
    "笔试通知",
    "面试通知",
}
COMPANY_ALIASES = {
    "dji": "大疆",
    "dji 大疆": "大疆",
    "iflytek": "科大讯飞",
    "讯飞": "科大讯飞",
    "antgroup": "蚂蚁",
    "pdd": "拼多多",
    "pdd拼多多": "拼多多",
    "拼多多集团pdd": "拼多多",
    "网易游戏雷火": "网易雷火",
}


def _clean_url(url: str) -> str:
    return url.rstrip(".,;:!?)]}。，；：！？）】")


def _clean_company(value: str | None) -> str | None:
    if not value:
        return None
    value = re.split(r"[|｜]", value, maxsplit=1)[0]
    value = re.sub(r"\s+", " ", value).strip(" -_：:")
    value = re.sub(r"(招聘|校招|校园招聘|通知)$", "", value).strip()
    alias = COMPANY_ALIASES.get(value.lower())
    if alias:
        return alias
    if not value or value.lower() in GENERIC_COMPANY_LABELS:
        return None
    return value


def _company(subject: str, text: str, sender: str) -> str | None:
    candidates = (
        re.search(r"来自\s*([^，。；:：]{2,30}?)\s*的(?:面试|笔试|测评|邀请)", subject),
        re.search(
            r"(?:欢迎投递|感谢您投递)\s*"
            r"([A-Za-z0-9\u4e00-\u9fff·&（）() ]{2,30}?)"
            r"(?=\s*(?:20\d{2}|[-—]|$))",
            subject,
        ),
        re.search(r"^([^【\[]{2,30})[【\[]", subject),
        re.search(
            r"^([A-Za-z0-9\u4e00-\u9fff·&（）() ]{2,30}?)(?=20\d{2}(?:年|届|校招|招聘)?)",
            subject,
        ),
        re.search(
            r"^([A-Za-z0-9\u4e00-\u9fff·&（）() ]{2,30}?)(?=邀请(?:你|您))",
            subject,
        ),
        re.search(r"[【\[]([^】\]]{2,30})[】\]]", subject),
        re.search(
            r"(?:欢迎申请|感谢您申请|来自)\s*"
            r"([\u4e00-\u9fffA-Za-z0-9·&（）() -]{2,30})",
            text,
        ),
        re.search(r"@([a-z0-9-]+)\.", sender, re.I),
    )
    for match in candidates:
        if not match:
            continue
        value = _clean_company(match.group(1))
        if value:
            return value
    return None


def classify_explicit_invitation(message: ParsedEmail) -> tuple[str | None, str]:
    subject = message.subject.lower()
    combined = f"{message.subject}\n{message.text}".lower()
    subject_has_target = bool(
        re.search(r"ai\s*(?:视频)?面试|(?:在线)?(?:测评|笔试|考试)|面试", subject, re.I)
    )
    if any(cue in subject for cue in IGNORE_SUBJECT_CUES) and not subject_has_target:
        return None, "投递、建档或招聘宣传邮件"
    action = r"(?:邀请(?:您|你)?|邀约|请(?:于|在|参加|完成)?|须|需要|务必|安排|到期|截止|报到)"

    def explicit(target: str) -> bool:
        return bool(
            re.search(rf"{action}.{{0,40}}{target}", combined, re.I | re.S)
            or re.search(rf"{target}.{{0,24}}{action}", combined, re.I | re.S)
        )

    ai_target = r"(?:ai\s*(?:视频)?面试|ai视频面试|ai面试)"
    assessment_target = r"(?:在线)?(?:测评|笔试|考试)"
    interview_target = r"(?:视频|电话|线上|线下|现场)?面试"

    if explicit(ai_target):
        return "ai面试", "明确 AI 面试邀约"
    if explicit(assessment_target):
        return "在线测评", "明确在线测评或笔试邀约"
    if explicit(interview_target):
        return "面试邀约", "明确面试邀约或安排"
    return None, "未明确要求参加或完成三类邀约"


def _parse_deadline(text: str, base: datetime) -> datetime | None:
    duration = DURATION_RE.search(text)
    if duration:
        amount = int(duration.group(1))
        delta = (
            timedelta(hours=amount)
            if duration.group(2) == "小时"
            else timedelta(days=amount)
        )
        return base.replace(tzinfo=None) + delta
    context = DEADLINE_CONTEXT_RE.search(text)
    if not context:
        return None
    absolute = ABSOLUTE_DATE_RE.search(context.group(1))
    if absolute:
        year, month, day, hour, minute = absolute.groups()
        return datetime(
            int(year),
            int(month),
            int(day),
            int(hour or 23),
            int(minute or 59),
        )
    cleaned = re.split(
        r"(?:之前|前)(?:完成|截止|有效|$)", context.group(1), maxsplit=1
    )[0]
    return dateparser.parse(
        cleaned,
        languages=["zh", "en"],
        settings={
            "RELATIVE_BASE": base.replace(tzinfo=None),
            "PREFER_DATES_FROM": "future",
            "RETURN_AS_TIMEZONE_AWARE": False,
        },
    )


def extract_with_rules(message: ParsedEmail) -> Extraction:
    stage, reason = classify_explicit_invitation(message)
    if not stage:
        return Extraction(is_recruitment=False, confidence=95, evidence=[reason])

    combined = f"{message.subject}\n{message.text}"
    urls = [_clean_url(value) for value in URL_RE.findall(combined)]
    preferred = [
        url
        for url in urls
        if any(
            key in url.lower()
            for key in ("assess", "exam", "test", "interview", "career", "campus")
        )
    ]
    return Extraction(
        is_recruitment=True,
        company=_company(message.subject, message.text, message.sender),
        stage=stage,
        deadline=_parse_deadline(combined, message.received_at),
        assessment_url=(preferred or urls or [None])[0],
        confidence=82,
        needs_review=False,
        evidence=[reason],
    )


SYSTEM_PROMPT = """你只抽取明确要求候选人采取行动的招聘邀约邮件。
允许的 category 只有：在线测评、ai面试、面试邀约。
投递成功、简历创建、验证码、招聘宣传、职位推荐、人才群邀请必须判为 explicit_action=false。
在线笔试统一归类为在线测评。
deadline 优先提取明确截止时间；若只有“收到邮件后 N 小时/天内”，用 received_at 计算。
只返回一个 JSON 对象，不要 Markdown。未知字段用 null，不得猜测。
格式：
{"explicit_action":boolean,"company":string|null,
"category":"在线测评"|"ai面试"|"面试邀约"|null,
"deadline":string|null,"assessment_url":string|null,
"confidence":integer,"needs_review":boolean}"""


def _json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.I)
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("LLM response does not contain a JSON object")
    value = json.loads(text[start : end + 1])
    if not isinstance(value, dict):
        raise ValueError("LLM response must be a JSON object")
    return value


class OpenAICompatibleExtractor:
    def __init__(self, settings: Settings):
        self.settings = settings

    def _request(self, provider, body: dict) -> httpx.Response:
        response: httpx.Response | None = None
        for attempt in range(3):
            try:
                response = httpx.post(
                    f"{provider.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {provider.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={**body, "model": provider.model},
                    timeout=self.settings.llm_timeout_seconds,
                )
                if response.status_code >= 500:
                    response.raise_for_status()
                return response
            except (httpx.TransportError, httpx.HTTPStatusError):
                if attempt == 2:
                    raise
                time.sleep(2**attempt)
        if response is None:
            raise RuntimeError("LLM request did not return a response")
        return response

    def extract(self, message: ParsedEmail) -> Extraction:
        rule_stage, _ = classify_explicit_invitation(message)
        if not rule_stage:
            return Extraction(is_recruitment=False, confidence=95)

        body = {
            "temperature": 0,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"received_at: {message.received_at.isoformat()}\n"
                        f"from: {message.sender}\nsubject: {message.subject}\n\n"
                        f"{message.text[:24000]}"
                    ),
                },
            ],
        }

        errors: list[str] = []
        retryable_status = {401, 402, 403, 408, 409, 429}
        for provider in self.settings.llm_providers:
            try:
                response = self._request(provider, body)
                response.raise_for_status()
                break
            except httpx.HTTPStatusError as error:
                errors.append(f"{provider.name}: {error}")
                if error.response.status_code not in retryable_status:
                    raise
            except httpx.TransportError as error:
                errors.append(f"{provider.name}: {error}")
        else:
            raise RuntimeError(f"All LLM providers failed: {'; '.join(errors)}")

        data = _json_object(response.json()["choices"][0]["message"]["content"])
        category = data.get("category")
        if category not in CATEGORIES:
            category = rule_stage
        deadline = dateparser.parse(str(data["deadline"])) if data.get("deadline") else None
        return Extraction(
            is_recruitment=bool(data.get("explicit_action")) and category in CATEGORIES,
            company=_clean_company(data.get("company")),
            stage=category,
            deadline=deadline,
            assessment_url=data.get("assessment_url") or None,
            confidence=max(0, min(100, int(data.get("confidence", 0)))),
            needs_review=bool(data.get("needs_review")),
        )
