from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from .config import Settings
from .extractors import OpenAICompatibleExtractor, extract_with_rules
from .feishu import BaseRecord, FeishuBaseClient
from .mailbox import ImapMailbox
from .models import Extraction, ParsedEmail
from .state import StateStore

logger = logging.getLogger(__name__)


@dataclass
class SyncSummary:
    fetched: int = 0
    already_processed: int = 0
    irrelevant: int = 0
    updated: int = 0
    needs_review: int = 0
    failed: int = 0
    details: list[dict[str, Any]] = field(default_factory=list)


def render_note(result: Extraction) -> str:
    return result.stage or ""


def render_deadline(result: Extraction) -> str | None:
    return result.deadline.strftime("%Y-%m-%d %H:%M") if result.deadline else None


def detail_for(
    message: ParsedEmail,
    status: str,
    result: Extraction | None = None,
    reason: str = "",
) -> dict[str, Any]:
    return {
        "messageId": message.message_id,
        "subject": message.subject,
        "sender": message.sender,
        "receivedAt": message.received_at.isoformat(),
        "company": result.company if result else None,
        "category": result.stage if result else None,
        "deadline": render_deadline(result) if result else None,
        "assessmentUrl": result.assessment_url if result else None,
        "status": status,
        "reason": reason or (result.evidence[0] if result and result.evidence else ""),
    }


class SyncService:
    def __init__(
        self,
        settings: Settings,
        mailbox: ImapMailbox | None = None,
        feishu: FeishuBaseClient | None = None,
        state: StateStore | None = None,
    ):
        self.settings = settings
        self.mailbox = mailbox or ImapMailbox(settings)
        self.feishu = feishu or FeishuBaseClient(settings)
        self.state = state or StateStore(settings.state_db_path)
        self.llm = OpenAICompatibleExtractor(settings)

    def close(self) -> None:
        self.feishu.close()
        self.state.close()

    def _extract(self, message: ParsedEmail) -> Extraction:
        result = extract_with_rules(message)
        if not result.is_recruitment:
            return result
        if not result.company or not result.deadline or not result.assessment_url:
            try:
                result.merge_missing(self.llm.extract(message))
            except Exception:
                logger.exception("LLM extraction failed for %s; using rules", message.message_id)
        result.needs_review = not result.company
        return result

    def _create_child(
        self, message: ParsedEmail, result: Extraction, parent: BaseRecord
    ) -> None:
        self.feishu.create_child_record(
            parent,
            result.company or "",
            message.subject,
            int(message.received_at.timestamp() * 1000),
            render_note(result),
            result.assessment_url,
            render_deadline(result),
        )

    def run_once(self) -> SyncSummary:
        self.feishu.validate_fields()
        records = self.feishu.list_records()
        messages = sorted(
            self.mailbox.fetch_recent(),
            key=lambda item: item.received_at,
            reverse=True,
        )
        summary = SyncSummary(fetched=len(messages))
        for message in messages:
            processed_outcome = self.state.processed_outcome(message.message_id)
            if processed_outcome:
                summary.already_processed += 1
                previous_status = {
                    "updated": "已写入",
                    "irrelevant": "已忽略",
                    "needs_review": "待确认",
                }.get(processed_outcome, "已跳过")
                summary.details.append(
                    detail_for(
                        message,
                        previous_status,
                        reason="本地去重记录已存在，本次同步已跳过",
                    )
                )
                continue
            try:
                result = self._extract(message)
                if not result.is_recruitment:
                    self.state.mark_processed(
                        message.message_id, message.uid, "irrelevant"
                    )
                    summary.irrelevant += 1
                    summary.details.append(
                        detail_for(message, "已忽略", result, result.evidence[0])
                    )
                    continue
                if not result.company:
                    self.state.mark_processed(
                        message.message_id, message.uid, "needs_review"
                    )
                    summary.needs_review += 1
                    summary.details.append(
                        detail_for(message, "待确认", result, "无法确定公司")
                    )
                    continue
                matches = self.feishu.find_company_parents(result.company, records)
                if len(matches) != 1:
                    self.state.mark_processed(
                        message.message_id, message.uid, "needs_review"
                    )
                    summary.needs_review += 1
                    reason = (
                        "目标表无该公司主记录"
                        if not matches
                        else "目标表存在多个同名公司主记录"
                    )
                    summary.details.append(detail_for(message, "待确认", result, reason))
                    continue
                self._create_child(message, result, matches[0])
                self.state.mark_processed(message.message_id, message.uid, "updated")
                summary.updated += 1
                summary.details.append(detail_for(message, "已写入", result))
            except Exception as error:
                logger.exception("Failed to process %s", message.message_id)
                summary.failed += 1
                summary.details.append(
                    detail_for(message, "失败", reason=str(error)[:180])
                )
        return summary
