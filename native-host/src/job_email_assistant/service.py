from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .config import Settings
from .extractors import OpenAICompatibleExtractor, REJECTION_STAGE, extract_with_rules
from .feishu import BaseRecord, FeishuBaseClient, normalize_company
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
        "uid": message.uid,
        "subject": message.subject,
        "sender": message.sender,
        "receivedAt": message.received_at.isoformat(),
        "company": result.company if result else None,
        "position": result.position if result else None,
        "category": result.stage if result else None,
        "deadline": render_deadline(result) if result else None,
        "assessmentUrl": result.assessment_url if result else None,
        "status": status,
        "reason": reason or (result.evidence[0] if result and result.evidence else ""),
    }


def serialize_mail_action(message: ParsedEmail, result: Extraction | None) -> str:
    return json.dumps(
        {
            "message": {
                "message_id": message.message_id,
                "uid": message.uid,
                "subject": message.subject,
                "sender": message.sender,
                "received_at": message.received_at.isoformat(),
                "text": message.text,
            },
            "extraction": {
                "is_recruitment": result.is_recruitment,
                "company": result.company,
                "position": result.position,
                "stage": result.stage,
                "deadline": result.deadline.isoformat() if result and result.deadline else None,
                "assessment_url": result.assessment_url,
                "confidence": result.confidence,
                "needs_review": result.needs_review,
                "evidence": result.evidence,
            }
            if result
            else None,
        },
        ensure_ascii=False,
    )


def deserialize_mail_action(snapshot_json: str) -> tuple[ParsedEmail, Extraction | None]:
    payload = json.loads(snapshot_json)
    source = payload["message"]
    message = ParsedEmail(
        message_id=source["message_id"],
        uid=source["uid"],
        subject=source["subject"],
        sender=source["sender"],
        received_at=datetime.fromisoformat(source["received_at"]),
        text=source["text"],
    )
    extraction = payload.get("extraction")
    if not extraction:
        return message, None
    deadline = extraction.get("deadline")
    return message, Extraction(
        is_recruitment=bool(extraction.get("is_recruitment")),
        company=extraction.get("company"),
        position=extraction.get("position"),
        stage=extraction.get("stage"),
        deadline=datetime.fromisoformat(deadline) if deadline else None,
        assessment_url=extraction.get("assessment_url"),
        confidence=int(extraction.get("confidence") or 0),
        needs_review=bool(extraction.get("needs_review")),
        evidence=list(extraction.get("evidence") or []),
    )


def strike_through(value: str) -> str:
    return "".join(f"{char}\u0336" if not char.isspace() else char for char in value)


def is_struck_through(value: str) -> bool:
    return "\u0336" in value


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
        # 拒信/流程结束邮件没有截止时间或链接可补，LLM 分类器也只认三类邀约，跳过以省一次调用。
        if result.stage == REJECTION_STAGE:
            result.needs_review = not result.company
            return result
        if not result.company or not result.deadline or not result.assessment_url:
            try:
                result.merge_missing(self.llm.extract(message))
            except Exception:
                logger.exception("LLM extraction failed for %s; using rules", message.message_id)
        result.needs_review = not result.company
        return result

    def _create_child(
        self, message: ParsedEmail, result: Extraction, parent: BaseRecord,
        todo_status: str = "待办",
    ) -> str:
        return self.feishu.create_child_record(
            parent,
            result.company or "",
            message.subject,
            int(message.received_at.timestamp() * 1000),
            render_note(result),
            result.assessment_url,
            render_deadline(result),
            position=result.position,
            todo_status=todo_status,
        )

    def _save_action(
        self,
        message: ParsedEmail,
        result: Extraction | None,
        feishu_record_id: str | None = None,
    ) -> None:
        self.state.save_mail_action(
            message.message_id,
            message.uid,
            serialize_mail_action(message, result),
            feishu_record_id,
        )

    def _load_manual_message(
        self, message_id: str, mail_snapshot: dict[str, Any] | None = None
    ) -> tuple[ParsedEmail, Extraction | None, str | None]:
        saved = self.state.mail_action(message_id)
        if saved:
            message, result = deserialize_mail_action(saved["snapshot_json"])
            return message, result, saved["feishu_record_id"]

        processed = self.state.processed_message(message_id)
        if mail_snapshot:
            received_at = str(mail_snapshot.get("receivedAt") or "").strip()
            try:
                parsed_received_at = datetime.fromisoformat(received_at)
            except ValueError:
                parsed_received_at = datetime.now().astimezone()
            message = ParsedEmail(
                message_id=message_id,
                uid=str(mail_snapshot.get("uid") or (processed or {}).get("uid") or ""),
                subject=str(mail_snapshot.get("subject") or ""),
                sender=str(mail_snapshot.get("sender") or ""),
                received_at=parsed_received_at,
                text="",
            )
            company = str(mail_snapshot.get("company") or "").strip() or None
            deadline = str(mail_snapshot.get("deadline") or "").strip()
            try:
                parsed_deadline = datetime.fromisoformat(deadline)
            except ValueError:
                parsed_deadline = None
            return message, Extraction(
                is_recruitment=bool(company),
                company=company,
                stage=str(mail_snapshot.get("category") or "").strip() or None,
                deadline=parsed_deadline,
                assessment_url=str(mail_snapshot.get("assessmentUrl") or "").strip() or None,
            ), None
        if not processed:
            raise ValueError("未找到本地任务记录，无法操作")
        fetch_by_uid = getattr(self.mailbox, "fetch_by_uid", None)
        message = fetch_by_uid(processed["uid"]) if fetch_by_uid else None
        if not message:
            raise ValueError("邮件已不在当前邮箱中，无法恢复任务")
        return message, None, None

    def _select_parent(
        self, company: str, records: list[BaseRecord], message: ParsedEmail
    ) -> BaseRecord:
        parents = self.feishu.find_company_parents(company, records)
        if not parents:
            raise ValueError("飞书中未找到该公司的主记录，不能写入")
        if normalize_company(company) == "快手" and re.search(
            r"校园招聘|校招", message.subject
        ):
            recruitment_parents = [
                parent
                for parent in parents
                if "招聘"
                in str(
                    parent.fields.get(
                        getattr(self.settings, "feishu_company_field", "公司")
                    )
                    or ""
                )
            ]
            if len(recruitment_parents) == 1:
                return recruitment_parents[0]
        return sorted(parents, key=lambda record: record.record_id)[0]

    def _resolve_child_record_id(
        self, message: ParsedEmail, result: Extraction
    ) -> str | None:
        records = self.feishu.find_child_records(
            result.company or "", message.subject, self.feishu.list_records()
        )
        if len(records) == 1:
            return records[0].record_id
        return None

    def _sync_completed_todos(self, records: list[BaseRecord]) -> int:
        updated = 0
        for record in records:
            if (
                not record.fields.get(
                    getattr(self.settings, "feishu_note_field", "note")
                )
                or str(record.fields.get("待办状态") or "") != "已完成"
            ):
                continue
            subject = str(
                record.fields.get(
                    getattr(self.settings, "feishu_subject_field", "最新进展记录")
                )
                or ""
            )
            fields: dict[str, Any] = {}
            if subject and not is_struck_through(subject):
                fields[
                    getattr(self.settings, "feishu_subject_field", "最新进展记录")
                ] = strike_through(subject)
            if not record.fields.get("完成时间"):
                fields["完成时间"] = int(datetime.now().timestamp() * 1000)
            if fields:
                self.feishu.update_record_fields(record, fields)
                updated += 1
        return updated

    def run_once(self) -> SyncSummary:
        self.feishu.validate_fields()
        records = self.feishu.list_records()
        messages = sorted(
            self.mailbox.fetch_recent(),
            key=lambda item: item.received_at,
            reverse=True,
        )
        summary = SyncSummary(fetched=len(messages))
        summary.updated += self._sync_completed_todos(records)
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
                    self._save_action(message, result)
                    summary.irrelevant += 1
                    summary.details.append(
                        detail_for(message, "已忽略", result, result.evidence[0])
                    )
                    continue
                if not result.company:
                    self.state.mark_processed(
                        message.message_id, message.uid, "needs_review"
                    )
                    self._save_action(message, result)
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
                    self._save_action(message, result)
                    summary.needs_review += 1
                    reason = (
                        "目标表无该公司主记录"
                        if not matches
                        else "目标表存在多个同名公司主记录"
                    )
                    summary.details.append(detail_for(message, "待确认", result, reason))
                    continue
                if result.stage == REJECTION_STAGE:
                    # 流程结束：把公司主记录进展标记为“已挂”，同时新增一条待办让用户直观看到最新进展。
                    self.feishu.mark_parent_progress(matches[0], "已挂")
                    child_record_id = self._create_child(
                        message, result, matches[0], todo_status="待办"
                    )
                    self.state.mark_processed(message.message_id, message.uid, "updated")
                    self._save_action(message, result, child_record_id)
                    summary.updated += 1
                    summary.details.append(
                        detail_for(message, "已挂", result, "已标记公司进展为已挂并生成待办")
                    )
                    continue
                child_record_id = self._create_child(message, result, matches[0])
                self.state.mark_processed(message.message_id, message.uid, "updated")
                self._save_action(message, result, child_record_id)
                summary.updated += 1
                summary.details.append(detail_for(message, "已写入", result))
            except Exception as error:
                logger.exception("Failed to process %s", message.message_id)
                summary.failed += 1
                summary.details.append(
                    detail_for(message, "失败", reason=str(error)[:180])
                )
        return summary

    def manual_action(
        self,
        message_id: str,
        action: str,
        mail_snapshot: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        message, result, child_record_id = self._load_manual_message(
            message_id, mail_snapshot
        )
        if action == "completed":
            if not result:
                result = self._extract(message)
            if not child_record_id:
                child_record_id = self._resolve_child_record_id(message, result)
            if not child_record_id:
                raise ValueError("该邮件尚未写入飞书子记录，不能标记完成")
            self.feishu.update_record_fields_by_id(
                child_record_id,
                {
                    self.settings.feishu_subject_field: strike_through(message.subject),
                    "待办状态": "已完成",
                    "完成时间": int(datetime.now().timestamp() * 1000),
                },
            )
            self.state.mark_processed(message.message_id, message.uid, "completed")
            self._save_action(message, result, child_record_id)
            return detail_for(message, "已完成", result, "已同步飞书子记录删除线")
        if action == "ignored":
            self.state.mark_processed(message.message_id, message.uid, "irrelevant")
            if child_record_id:
                self.feishu.update_record_fields_by_id(
                    child_record_id, {"待办状态": "已忽略"}
                )
            self._save_action(message, result)
            return detail_for(message, "已忽略", result, "已手动忽略")
        if action != "confirm_write":
            raise ValueError("不支持的邮件操作")

        self.feishu.validate_fields()
        result = result or self._extract(message)
        if not result.is_recruitment or not result.company:
            raise ValueError("无法确认该邮件对应的招聘公司，不能写入")
        parent = self._select_parent(
            result.company, self.feishu.list_records(), message
        )
        result.company = str(
            parent.fields.get(
                getattr(self.settings, "feishu_company_field", "公司")
            )
            or result.company
        )
        if result.stage == REJECTION_STAGE:
            self.feishu.mark_parent_progress(parent, "已挂")
            child_record_id = self._create_child(message, result, parent, todo_status="待办")
            self.state.mark_processed(message.message_id, message.uid, "updated")
            self._save_action(message, result, child_record_id)
            return detail_for(message, "已挂", result, "已标记公司进展为已挂并生成待办")
        child_record_id = self._create_child(message, result, parent)
        self.state.mark_processed(message.message_id, message.uid, "updated")
        self._save_action(message, result, child_record_id)
        return detail_for(message, "已写入", result, "已手动确认并写入飞书")
