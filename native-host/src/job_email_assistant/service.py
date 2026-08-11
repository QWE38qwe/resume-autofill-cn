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

    def _update_match(
        self, result: Extraction, record: BaseRecord
    ) -> None:
        if self.settings.dry_run:
            logger.info("Dry run: would update %s for %s", record.record_id, result.company)
            return
        self.feishu.update_record(
            record,
            render_note(result),
            result.assessment_url,
            render_deadline(result),
        )

    def run_once(self) -> SyncSummary:
        self.feishu.validate_fields()
        records = self.feishu.list_records()
        messages = self.mailbox.fetch_recent()
        summary = SyncSummary(fetched=len(messages))
        for message in messages:
            if self.state.is_processed(message.message_id):
                summary.already_processed += 1
                summary.details.append(
                    detail_for(message, "已处理", reason="本地去重记录已存在")
                )
                continue
            try:
                result = self._extract(message)
                if not result.is_recruitment:
                    if not self.settings.dry_run:
                        self.state.mark_processed(
                            message.message_id, message.uid, "irrelevant"
                        )
                    summary.irrelevant += 1
                    summary.details.append(
                        detail_for(message, "已忽略", result, result.evidence[0])
                    )
                    continue
                if not result.company:
                    if not self.settings.dry_run:
                        self.state.mark_processed(
                            message.message_id, message.uid, "needs_review"
                        )
                    summary.needs_review += 1
                    summary.details.append(
                        detail_for(message, "待确认", result, "无法确定公司")
                    )
                    continue
                matches = self.feishu.find_company(result.company, records)
                if len(matches) != 1:
                    if not self.settings.dry_run:
                        self.state.mark_processed(
                            message.message_id, message.uid, "needs_review"
                        )
                    summary.needs_review += 1
                    reason = "目标表无该公司" if not matches else "目标表存在同名公司"
                    summary.details.append(detail_for(message, "待确认", result, reason))
                    continue
                self._update_match(result, matches[0])
                if not self.settings.dry_run:
                    self.state.mark_processed(message.message_id, message.uid, "updated")
                summary.updated += 1
                summary.details.append(
                    detail_for(
                        message,
                        "将写入" if self.settings.dry_run else "已写入",
                        result,
                    )
                )
            except Exception as error:
                logger.exception("Failed to process %s", message.message_id)
                summary.failed += 1
                summary.details.append(
                    detail_for(message, "失败", reason=str(error)[:180])
                )
        return summary
