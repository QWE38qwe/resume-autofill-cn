from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from job_email_assistant.feishu import (
    BaseRecord,
    FeishuBaseClient,
    has_link_value,
    normalize_company,
)
from job_email_assistant.models import Extraction, ParsedEmail
from job_email_assistant.service import (
    SyncService,
    render_deadline,
    render_note,
    serialize_mail_action,
    strike_through,
)
from job_email_assistant.state import StateStore


def test_company_normalization() -> None:
    assert normalize_company("腾讯招聘") == "腾讯"
    assert normalize_company("DJI 大疆") == "大疆"
    assert normalize_company("讯飞") == "科大讯飞"
    assert normalize_company("拼多多集团PDD") == "拼多多"
    assert normalize_company("PDD拼多多") == "拼多多"
    assert normalize_company("小鹏集团") == "小鹏汽车"
    assert normalize_company("小鹏") == "小鹏汽车"


def test_note_is_exact_category_only() -> None:
    for category in ("在线测评", "ai面试", "面试邀约"):
        result = Extraction(is_recruitment=True, company="快手", stage=category)
        assert render_note(result) == category


def test_deadline_text_format() -> None:
    result = Extraction(deadline=datetime(2026, 8, 13, 23, 59))
    assert render_deadline(result) == "2026-08-13 23:59"
    assert render_deadline(Extraction()) is None


def test_needs_review_state_can_be_retried(tmp_path) -> None:
    state = StateStore(tmp_path / "state.db")
    try:
        state.mark_processed("<review>", "1", "needs_review")
        state.mark_processed("<updated>", "2", "updated")
        assert state.processed_outcome("<updated>") == "updated"
        assert state.clear_outcome("needs_review") == 1
        assert state.processed_outcome("<review>") is None
        assert state.is_processed("<review>") is False
        assert state.is_processed("<updated>") is True
    finally:
        state.close()


def test_company_parent_matching_ignores_child_records() -> None:
    client = object.__new__(FeishuBaseClient)
    client.settings = SimpleNamespace(
        feishu_company_field="公司",
        feishu_parent_field="父记录",
    )
    records = [
        BaseRecord("parent", {"公司": "字节跳动"}),
        BaseRecord("child", {"公司": "字节跳动", "父记录": ["parent"]}),
    ]
    assert client.find_company_parents("字节跳动", records) == [records[0]]


def test_empty_feishu_link_placeholder_is_not_a_parent_link() -> None:
    placeholder = [{"table_id": "table", "text_arr": [], "type": "text"}]
    assert has_link_value(placeholder) is False
    assert has_link_value(["parent-record"]) is True


def test_create_child_record_uses_parent_and_mail_time_fields() -> None:
    client = object.__new__(FeishuBaseClient)
    client.settings = SimpleNamespace(
        feishu_base_token="base",
        feishu_table_id="table",
        feishu_company_field="公司",
        feishu_note_field="note",
        feishu_parent_field="父记录",
        feishu_received_at_field="开始日期",
        feishu_subject_field="最新进展记录",
        feishu_assessment_link_field="测评链接",
        feishu_ddl_field="ddl",
    )
    captured = {}

    def request(method, path, **kwargs):
        captured.update(method=method, path=path, **kwargs)
        return {"record": {"record_id": "child"}}

    client._request = request
    record_id = client.create_child_record(
        BaseRecord("parent", {"公司": "字节跳动"}),
        "字节跳动",
        "面试邀请",
        1786507200000,
        "面试邀约",
        "https://example.com/interview",
        "2026-08-13 15:00",
    )

    assert record_id == "child"
    assert captured["method"] == "POST"
    assert captured["json"]["fields"]["父记录"] == ["parent"]
    assert captured["json"]["fields"]["开始日期"] == 1786507200000
    assert captured["json"]["fields"]["最新进展记录"] == "面试邀请"
    assert captured["json"]["fields"]["待办状态"] == "待办"


class FakeMailbox:
    def __init__(self, messages: list[ParsedEmail]):
        self.messages = messages

    def fetch_recent(self) -> list[ParsedEmail]:
        return self.messages

    def fetch_by_uid(self, uid: str) -> ParsedEmail | None:
        return next((message for message in self.messages if message.uid == uid), None)


class FakeFeishu:
    def __init__(self, parents: list[BaseRecord]):
        self.parents = parents
        self.created: list[dict] = []
        self.updated: list[tuple[str, dict]] = []

    def validate_fields(self) -> None:
        pass

    def list_records(self) -> list[BaseRecord]:
        return self.parents

    def find_company_parents(
        self, company: str, records: list[BaseRecord]
    ) -> list[BaseRecord]:
        return [
            record
            for record in records
            if normalize_company(str(record.fields.get("公司") or ""))
            == normalize_company(company)
        ]

    def create_child_record(
        self,
        parent: BaseRecord,
        company: str,
        subject: str,
        received_at: int,
        note: str,
        assessment_url: str | None,
        deadline: str | None,
        position: str | None = None,
        todo_status: str = "待办",
    ) -> str:
        self.created.append(
            {
                "parent": parent.record_id,
                "company": company,
                "subject": subject,
                "received_at": received_at,
                "note": note,
                "assessment_url": assessment_url,
                "deadline": deadline,
                "position": position,
                "todo_status": todo_status,
            }
        )
        return f"child-{len(self.created)}"

    def mark_parent_progress(self, parent: BaseRecord, progress: str) -> None:
        self.updated.append((parent.record_id, {"进展": progress}))

    def find_child_records(
        self, company: str, subject: str, records: list[BaseRecord]
    ) -> list[BaseRecord]:
        return [
            record
            for record in records
            if record.fields.get("公司") == company
            and record.fields.get("最新进展记录") == subject
            and record.fields.get("父记录")
        ]

    def update_record_fields_by_id(self, record_id: str, fields: dict) -> None:
        self.updated.append((record_id, fields))

    def update_record_fields(self, record: BaseRecord, fields: dict) -> None:
        self.updated.append((record.record_id, fields))

    def close(self) -> None:
        pass


def parsed_email(message_id: str, subject: str, received_at: datetime) -> ParsedEmail:
    return ParsedEmail(
        message_id=message_id,
        uid=message_id,
        subject=subject,
        sender="careers@example.com",
        received_at=received_at,
        text="",
    )


def test_sync_creates_children_newest_first_and_skips_processed(tmp_path) -> None:
    now = datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc)
    messages = [
        parsed_email("old", "旧面试", now - timedelta(hours=2)),
        parsed_email("new", "新面试", now - timedelta(hours=1)),
    ]
    feishu = FakeFeishu([BaseRecord("parent", {"公司": "字节跳动"})])
    state = StateStore(tmp_path / "state.db")
    service = SyncService(
        SimpleNamespace(llm_providers=()),
        mailbox=FakeMailbox(messages),
        feishu=feishu,
        state=state,
    )
    service._extract = lambda message: Extraction(
        is_recruitment=True,
        company="字节跳动",
        stage="面试邀约",
        assessment_url=f"https://example.com/{message.message_id}",
    )

    first = service.run_once()
    second = service.run_once()

    assert first.updated == 2
    assert [item["subject"] for item in feishu.created] == ["新面试", "旧面试"]
    assert all(item["note"] == "面试邀约" for item in feishu.created)
    assert second.updated == 0
    assert second.already_processed == 2
    assert {item["status"] for item in second.details} == {"已写入"}
    service.close()


def test_multiple_company_parents_require_manual_review(tmp_path) -> None:
    now = datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc)
    feishu = FakeFeishu(
        [
            BaseRecord("parent-1", {"公司": "字节跳动"}),
            BaseRecord("parent-2", {"公司": "字节跳动"}),
        ]
    )
    state = StateStore(tmp_path / "state.db")
    service = SyncService(
        SimpleNamespace(llm_providers=()),
        mailbox=FakeMailbox([parsed_email("mail", "面试", now)]),
        feishu=feishu,
        state=state,
    )
    service._extract = lambda message: Extraction(
        is_recruitment=True,
        company="字节跳动",
        stage="面试邀约",
    )

    summary = service.run_once()

    assert summary.needs_review == 1
    assert not feishu.created
    assert state.is_processed("mail") is True
    service.close()


def test_manual_confirm_write_creates_child_and_updates_outcome(tmp_path) -> None:
    now = datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc)
    message = parsed_email("manual", "手动确认邮件", now)
    feishu = FakeFeishu([BaseRecord("parent", {"公司": "字节跳动"})])
    state = StateStore(tmp_path / "state.db")
    state.mark_processed(message.message_id, message.uid, "needs_review")
    service = SyncService(
        SimpleNamespace(llm_providers=()),
        mailbox=FakeMailbox([message]),
        feishu=feishu,
        state=state,
    )
    service._extract = lambda _: Extraction(
        is_recruitment=True, company="字节跳动", stage="在线测评"
    )

    detail = service.manual_action("manual", "confirm_write")

    assert detail["status"] == "已写入"
    assert len(feishu.created) == 1
    assert state.processed_outcome("manual") == "updated"
    service.close()


def test_manual_confirm_write_selects_a_stable_parent_when_company_is_duplicated(
    tmp_path,
) -> None:
    now = datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc)
    message = parsed_email("xpeng", "小鹏测评", now)
    feishu = FakeFeishu(
        [
            BaseRecord("parent-z", {"公司": "小鹏汽车"}),
            BaseRecord("parent-a", {"公司": "小鹏汽车"}),
        ]
    )
    state = StateStore(tmp_path / "state.db")
    state.mark_processed(message.message_id, message.uid, "needs_review")
    service = SyncService(
        SimpleNamespace(llm_providers=()),
        mailbox=FakeMailbox([message]),
        feishu=feishu,
        state=state,
    )
    service._extract = lambda _: Extraction(
        is_recruitment=True, company="小鹏汽车", stage="在线测评"
    )

    detail = service.manual_action("xpeng", "confirm_write")

    assert detail["status"] == "已写入"
    assert feishu.created[0]["parent"] == "parent-a"
    service.close()


def test_manual_confirm_write_normalizes_xpeng_group_for_parent_and_child(
    tmp_path,
) -> None:
    now = datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc)
    message = parsed_email("xpeng-group", "小鹏测评", now)
    feishu = FakeFeishu([BaseRecord("parent", {"公司": "小鹏汽车"})])
    state = StateStore(tmp_path / "state.db")
    state.mark_processed(message.message_id, message.uid, "needs_review")
    service = SyncService(
        SimpleNamespace(llm_providers=()),
        mailbox=FakeMailbox([message]),
        feishu=feishu,
        state=state,
    )
    service._extract = lambda _: Extraction(
        is_recruitment=True, company="小鹏集团", stage="在线测评"
    )

    detail = service.manual_action("xpeng-group", "confirm_write")

    assert detail["status"] == "已写入"
    assert feishu.created[0]["parent"] == "parent"
    assert feishu.created[0]["company"] == "小鹏汽车"
    service.close()


def test_manual_confirm_write_routes_kuaishou_campus_mail_to_recruitment_parent(
    tmp_path,
) -> None:
    now = datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc)
    message = parsed_email("kuaishou", "【快手校园招聘】在线人才测评邀请", now)
    feishu = FakeFeishu(
        [
            BaseRecord("job-parent", {"公司": "快手"}),
            BaseRecord("recruitment-parent", {"公司": "快手招聘"}),
        ]
    )
    state = StateStore(tmp_path / "state.db")
    state.mark_processed(message.message_id, message.uid, "needs_review")
    service = SyncService(
        SimpleNamespace(llm_providers=()),
        mailbox=FakeMailbox([message]),
        feishu=feishu,
        state=state,
    )
    service._extract = lambda _: Extraction(
        is_recruitment=True, company="快手", stage="在线测评"
    )

    detail = service.manual_action("kuaishou", "confirm_write")

    assert detail["status"] == "已写入"
    assert feishu.created[0]["parent"] == "recruitment-parent"
    assert feishu.created[0]["company"] == "快手招聘"
    service.close()


def test_completed_history_updates_linked_child_without_recent_window(tmp_path) -> None:
    now = datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc)
    message = parsed_email("pdd", "拼多多测评", now - timedelta(days=5))
    feishu = FakeFeishu([BaseRecord("parent", {"公司": "拼多多"})])
    state = StateStore(tmp_path / "state.db")
    state.mark_processed(message.message_id, message.uid, "updated")
    state.save_mail_action(
        message.message_id,
        message.uid,
        serialize_mail_action(
            message,
            Extraction(is_recruitment=True, company="拼多多", stage="在线测评"),
        ),
        "pdd-child",
    )
    service = SyncService(
        SimpleNamespace(llm_providers=(), feishu_subject_field="最新进展记录"),
        mailbox=FakeMailbox([]),
        feishu=feishu,
        state=state,
    )

    detail = service.manual_action("pdd", "completed")

    assert detail["status"] == "已完成"
    assert state.processed_outcome("pdd") == "completed"
    assert feishu.updated[0][0] == "pdd-child"
    assert feishu.updated[0][1]["最新进展记录"] == strike_through("拼多多测评")
    assert feishu.updated[0][1]["待办状态"] == "已完成"
    assert "完成时间" in feishu.updated[0][1]
    service.close()


def test_completed_history_uses_ui_snapshot_when_imap_is_unavailable(tmp_path) -> None:
    now = datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc)
    message = parsed_email("legacy", "拼多多历史测评", now - timedelta(days=5))
    feishu = FakeFeishu(
        [
            BaseRecord("parent", {"公司": "拼多多"}),
            BaseRecord(
                "pdd-child",
                {
                    "公司": "拼多多",
                    "父记录": ["parent"],
                    "最新进展记录": message.subject,
                },
            ),
        ]
    )
    state = StateStore(tmp_path / "state.db")
    state.mark_processed(message.message_id, message.uid, "updated")
    service = SyncService(
        SimpleNamespace(llm_providers=(), feishu_subject_field="最新进展记录"),
        mailbox=FakeMailbox([]),
        feishu=feishu,
        state=state,
    )

    detail = service.manual_action(
        "legacy",
        "completed",
        {
            "uid": message.uid,
            "subject": message.subject,
            "sender": message.sender,
            "receivedAt": message.received_at.isoformat(),
            "company": "拼多多",
            "category": "在线测评",
        },
    )

    assert detail["status"] == "已完成"
    assert feishu.updated[0][0] == "pdd-child"
    assert feishu.updated[0][1]["最新进展记录"] == strike_through(message.subject)
    assert feishu.updated[0][1]["待办状态"] == "已完成"
    assert "完成时间" in feishu.updated[0][1]
    service.close()


def test_sync_marks_completed_todo_subject_with_strikethrough(tmp_path) -> None:
    now = datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc)
    message = parsed_email("new", "新测评", now)
    feishu = FakeFeishu(
        [
            BaseRecord(
                "todo-child",
                {
                    "公司": "字节跳动",
                    "父记录": ["parent"],
                    "note": "在线测评",
                    "待办状态": "已完成",
                    "最新进展记录": "已完成测评",
                },
            ),
        ]
    )
    state = StateStore(tmp_path / "state.db")
    service = SyncService(
        SimpleNamespace(
            llm_providers=(),
            feishu_note_field="note",
            feishu_subject_field="最新进展记录",
        ),
        mailbox=FakeMailbox([message]),
        feishu=feishu,
        state=state,
    )
    service._extract = lambda _: Extraction(is_recruitment=False)

    summary = service.run_once()

    assert summary.updated == 1
    assert feishu.updated[0][0] == "todo-child"
    assert feishu.updated[0][1]["最新进展记录"] == strike_through("已完成测评")
    assert "完成时间" in feishu.updated[0][1]
    service.close()


def test_sync_rejection_marks_parent_hung_and_creates_todo(tmp_path) -> None:
    now = datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc)
    message = parsed_email("yutong", "很遗憾通知您本次未能入选", now)
    feishu = FakeFeishu([BaseRecord("parent", {"公司": "宇通"})])
    state = StateStore(tmp_path / "state.db")
    service = SyncService(
        SimpleNamespace(
            llm_providers=(),
            feishu_note_field="note",
            feishu_subject_field="最新进展记录",
            feishu_progress_field="进展",
            feishu_position_field="岗位",
        ),
        mailbox=FakeMailbox([message]),
        feishu=feishu,
        state=state,
    )
    service._extract = lambda _: Extraction(
        is_recruitment=True,
        company="宇通",
        position="软件工程师",
        stage="流程结束",
    )

    summary = service.run_once()

    assert summary.updated == 1
    assert ("parent", {"进展": "已挂"}) in feishu.updated
    assert len(feishu.created) == 1
    assert feishu.created[0]["parent"] == "parent"
    assert feishu.created[0]["position"] == "软件工程师"
    assert feishu.created[0]["todo_status"] == "待办"
    assert state.processed_outcome("yutong") == "updated"
    service.close()
