import sqlite3
from datetime import datetime

from job_email_assistant.config import Settings
from job_email_assistant.models import ParsedEmail, Extraction
from job_email_assistant.service import SyncService, normalize_task_url, task_key
from job_email_assistant.state import StateStore


class FakeMailbox:
    def __init__(self, messages): self.messages = messages
    def fetch_recent(self): return self.messages


def settings(tmp_path):
    return Settings.from_payload({"mail": {"address": "a", "authCode": "b"}, "ai": {"apiBase": "https://api.example.test", "apiKey": "k", "model": "m"}}, tmp_path / "state.db")


def test_local_sync_and_duplicate_url(tmp_path):
    message = ParsedEmail("m1", "1", "岚图汽车在线测评邀请", "hr@example.com", datetime(2026, 9, 13, 10), "请在 2026-09-15 18:00 前完成测评 https://x.test/task?id=1&utm_source=x")
    service = SyncService(settings(tmp_path), mailbox=FakeMailbox([message]))
    summary = service.run_once()
    assert summary.new_tasks == 1
    assert summary.details[0]["company"] == "岚图汽车"
    assert "feishu" not in summary.details[0]
    assert normalize_task_url("https://X.TEST/task/?utm_source=x&id=1") == "https://x.test/task?id=1"
    service.close()


def test_task_key_is_stable_without_tracking_params():
    result = Extraction(company="岚图汽车", stage="在线测评", assessment_url="https://x.test/a?utm_source=x&id=7")
    assert task_key(result) == "url:https://x.test/a?id=7"


def test_legacy_feishu_column_is_migrated(tmp_path):
    path = tmp_path / "legacy.db"
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE mail_actions (message_id TEXT PRIMARY KEY, imap_uid TEXT, snapshot_json TEXT, updated_at TEXT, feishu_record_id TEXT)")
    conn.execute("INSERT INTO mail_actions VALUES ('m','1','{}','now','record')")
    conn.commit(); conn.close()
    store = StateStore(path)
    columns = {row[1] for row in store.connection.execute("PRAGMA table_info(mail_actions)")}
    assert "feishu_record_id" not in columns
    assert store.mail_action("m")["snapshot_json"] == "{}"
    store.close()
