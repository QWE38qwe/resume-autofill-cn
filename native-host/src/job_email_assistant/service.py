from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .config import Settings
from .extractors import (
    CATEGORIES,
    REJECTION_STAGE,
    OpenAICompatibleExtractor,
    company_needs_review,
    extract_with_rules,
    has_task_candidate,
    is_system_receipt,
)
from .models import Extraction, ParsedEmail
from .state import StateStore

logger = logging.getLogger(__name__)
TRACKING_PARAMS = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "spm", "from"}


@dataclass
class SyncSummary:
    fetched: int = 0
    already_processed: int = 0
    irrelevant: int = 0
    new_tasks: int = 0
    duplicates: int = 0
    needs_company_review: int = 0
    failed: int = 0
    details: list[dict[str, Any]] = field(default_factory=list)


def render_note(result: Extraction) -> str:
    return result.stage or ""


def render_deadline(result: Extraction) -> str | None:
    return result.deadline.strftime("%Y-%m-%d %H:%M") if result.deadline else None


def normalize_task_url(value: str | None) -> str:
    if not value:
        return ""
    try:
        parsed = urlsplit(value.strip())
        query = [(key, item) for key, item in parse_qsl(parsed.query, keep_blank_values=True) if key.lower() not in TRACKING_PARAMS]
        return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path.rstrip("/"), urlencode(sorted(query)), ""))
    except ValueError:
        return value.strip().rstrip("/").lower()


def task_key(result: Extraction) -> str | None:
    url = normalize_task_url(result.assessment_url)
    if url:
        return f"url:{url}"
    company = re.sub(r"\W+", "", (result.company or "").lower())
    category = re.sub(r"\W+", "", (result.stage or "").lower())
    position = re.sub(r"\W+", "", (result.position or "").lower())
    deadline = render_deadline(result) or ""
    if not company or not category or not deadline:
        return None
    return f"task:{company}|{category}|{position}|{deadline}"


def detail_for(message: ParsedEmail, status: str, result: Extraction | None = None, reason: str = "") -> dict[str, Any]:
    return {
        "messageId": message.message_id,
        "uid": message.uid,
        "subject": message.subject,
        "sender": message.sender,
        "receivedAt": message.received_at.isoformat(),
        "company": result.company if result else None,
        "companyRaw": result.company if result else None,
        "companySource": result.company_source if result else None,
        "companyConfidence": result.company_confidence if result else 0,
        "needsCompanyReview": bool(result and (result.needs_review or company_needs_review(result.company))),
        "position": result.position if result else None,
        "category": result.stage if result else None,
        "deadline": render_deadline(result) if result else None,
        "assessmentUrl": result.assessment_url if result else None,
        "taskKey": task_key(result) if result else None,
        "status": status,
        "reason": reason or (result.evidence[0] if result and result.evidence else ""),
        "completedAt": None,
        "clearTaskFields": bool(result is not None and not result.is_recruitment),
    }


def serialize_mail_action(message: ParsedEmail, result: Extraction | None) -> str:
    return json.dumps({
        "message": {
            "message_id": message.message_id, "uid": message.uid, "subject": message.subject,
            "sender": message.sender, "received_at": message.received_at.isoformat(),
        },
        "extraction": {
            "is_recruitment": result.is_recruitment, "company": result.company,
            "position": result.position, "stage": result.stage,
            "deadline": result.deadline.isoformat() if result and result.deadline else None,
            "assessment_url": result.assessment_url, "confidence": result.confidence,
            "needs_review": result.needs_review, "evidence": result.evidence,
            "company_source": result.company_source, "company_confidence": result.company_confidence,
        } if result else None,
    }, ensure_ascii=False)


def deserialize_mail_action(snapshot_json: str) -> tuple[ParsedEmail, Extraction | None]:
    payload = json.loads(snapshot_json)
    source = payload["message"]
    message = ParsedEmail(
        message_id=source["message_id"], uid=source["uid"], subject=source["subject"],
        sender=source["sender"], received_at=datetime.fromisoformat(source["received_at"]), text="",
    )
    extraction = payload.get("extraction")
    if not extraction:
        return message, None
    deadline = extraction.get("deadline")
    return message, Extraction(
        is_recruitment=bool(extraction.get("is_recruitment")), company=extraction.get("company"),
        position=extraction.get("position"), stage=extraction.get("stage"),
        deadline=datetime.fromisoformat(deadline) if deadline else None,
        assessment_url=extraction.get("assessment_url"), confidence=int(extraction.get("confidence") or 0),
        needs_review=bool(extraction.get("needs_review")), evidence=list(extraction.get("evidence") or []),
        company_source=extraction.get("company_source"),
        company_confidence=int(extraction.get("company_confidence") or 0),
    )


class SyncService:
    def __init__(self, settings: Settings, mailbox=None, state: StateStore | None = None):
        self.settings = settings
        from .mailbox import ImapMailbox
        self.mailbox = mailbox or ImapMailbox(settings)
        self.state = state or StateStore(settings.state_db_path)
        self.llm = OpenAICompatibleExtractor(settings)

    def close(self) -> None:
        self.state.close()

    def _extract(self, message: ParsedEmail) -> Extraction:
        result = extract_with_rules(message)
        if not result.is_recruitment:
            # 系统回执和没有任务目标的邮件永不进入 AI，避免把正文里的历史内容重新解释成任务。
            if is_system_receipt(message) or not has_task_candidate(message):
                return result
            # 规则无法确定但存在测评/面试目标时，才交给 AI 做二次准入。
            try:
                ai_result = self.llm.extract(message)
                if not ai_result.is_recruitment:
                    return Extraction(is_recruitment=False, confidence=ai_result.confidence, evidence=ai_result.evidence or result.evidence)
                if ai_result.confidence < 85 or ai_result.needs_review:
                    ai_result.is_recruitment = True
                    ai_result.needs_review = True
                return ai_result
            except Exception:
                logger.exception("LLM admission failed for %s; keeping it out of tasks", message.message_id)
                return Extraction(is_recruitment=False, confidence=0, evidence=["AI 准入失败，未加入任务"])
        if not result.company or company_needs_review(result.company) or not result.deadline or not result.assessment_url:
            try:
                ai_result = self.llm.extract(message)
                # 明确任务已经由规则准入；这里 AI 只补字段，不能把任务改成非任务。
                if ai_result.company and (not result.company or company_needs_review(result.company)):
                    result.company = ai_result.company
                    result.company_source = "ai"
                    result.company_confidence = ai_result.company_confidence
                result.merge_missing(ai_result)
            except Exception:
                logger.exception("LLM extraction failed for %s; using rules", message.message_id)
        if result.company and company_needs_review(result.company):
            result.company = None
            result.needs_review = True
        if not result.company:
            result.needs_review = True
        return result

    def _save_action(self, message: ParsedEmail, result: Extraction | None) -> None:
        self.state.save_mail_action(message.message_id, message.uid, serialize_mail_action(message, result))

    def _processed_detail(self, message: ParsedEmail, outcome: str) -> dict[str, Any]:
        saved = self.state.mail_action(message.message_id)
        result = None
        if saved:
            try:
                _, result = deserialize_mail_action(saved["snapshot_json"])
            except (KeyError, TypeError, ValueError, json.JSONDecodeError):
                logger.warning("Invalid local mail snapshot for %s", message.message_id)
        # 旧版本可能把系统回执存成 updated；每次仍在 lookback 内的机器记录都重新走准入，
        # 这样新规则可以自动回收历史误判。前端手工终态由 background.js 合并时保护。
        should_refresh = True
        if should_refresh:
            try:
                refreshed = self._extract(message)
                result = refreshed
                self._save_action(message, result)
                if refreshed.stage in CATEGORIES and refreshed.is_recruitment:
                    outcome = "needs_review" if refreshed.needs_review else "updated"
                    self.state.mark_processed(message.message_id, message.uid, outcome)
                elif refreshed.stage == REJECTION_STAGE and refreshed.is_recruitment:
                    outcome = "hung"
                    self.state.mark_processed(message.message_id, message.uid, outcome)
                else:
                    outcome = "irrelevant"
                    self.state.mark_processed(message.message_id, message.uid, outcome)
            except Exception:
                logger.exception("Historical company refresh failed for %s", message.message_id)
        status = {"irrelevant": "已忽略", "completed": "已完成", "hung": "已挂", "needs_review": "待确认"}.get(outcome, "待办")
        return detail_for(message, status, result, "本地去重记录已存在，本次同步已跳过")

    def run_once(self) -> SyncSummary:
        messages = sorted(self.mailbox.fetch_recent(), key=lambda item: item.received_at, reverse=True)
        summary = SyncSummary(fetched=len(messages))
        for message in messages:
            processed_outcome = self.state.processed_outcome(message.message_id)
            if processed_outcome:
                summary.already_processed += 1
                summary.details.append(self._processed_detail(message, processed_outcome))
                continue
            try:
                result = self._extract(message)
                if not result.is_recruitment:
                    self.state.mark_processed(message.message_id, message.uid, "irrelevant")
                    self._save_action(message, result)
                    summary.irrelevant += 1
                    summary.details.append(detail_for(message, "已忽略", result, result.evidence[0] if result.evidence else "非任务邮件"))
                    continue
                outcome = "needs_review" if result.needs_review else "updated"
                self.state.mark_processed(message.message_id, message.uid, outcome)
                self._save_action(message, result)
                summary.new_tasks += 1
                if result.needs_review:
                    summary.needs_company_review += 1
                status = "已挂" if result.stage == REJECTION_STAGE else ("待确认" if result.needs_review else "待办")
                summary.details.append(detail_for(message, status, result, "公司待确认" if result.needs_review else "已加入本地任务"))
            except Exception as error:
                logger.exception("Failed to process %s", message.message_id)
                summary.failed += 1
                summary.details.append(detail_for(message, "失败", reason=str(error)[:180]))
        return summary
