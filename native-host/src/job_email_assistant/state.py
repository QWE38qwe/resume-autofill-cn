from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class StateStore:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(path)
        self.connection.execute(
            """
            CREATE TABLE IF NOT EXISTS processed_messages (
                message_id TEXT PRIMARY KEY,
                imap_uid TEXT NOT NULL,
                outcome TEXT NOT NULL,
                processed_at TEXT NOT NULL
            )
            """
        )
        self.connection.execute(
            """
            CREATE TABLE IF NOT EXISTS mail_actions (
                message_id TEXT PRIMARY KEY,
                imap_uid TEXT NOT NULL,
                snapshot_json TEXT NOT NULL,
                feishu_record_id TEXT,
                updated_at TEXT NOT NULL
            )
            """
        )
        self._remove_legacy_mail_bodies()
        self.connection.commit()

    def _remove_legacy_mail_bodies(self) -> None:
        rows = self.connection.execute(
            "SELECT message_id, snapshot_json FROM mail_actions"
        ).fetchall()
        for message_id, snapshot_json in rows:
            try:
                payload = json.loads(str(snapshot_json))
            except (TypeError, ValueError, json.JSONDecodeError):
                continue
            message = payload.get("message")
            if not isinstance(message, dict) or "text" not in message:
                continue
            del message["text"]
            self.connection.execute(
                "UPDATE mail_actions SET snapshot_json = ? WHERE message_id = ?",
                (json.dumps(payload, ensure_ascii=False), message_id),
            )

    def is_processed(self, message_id: str) -> bool:
        return self.processed_outcome(message_id) is not None

    def processed_outcome(self, message_id: str) -> str | None:
        row = self.connection.execute(
            "SELECT outcome FROM processed_messages WHERE message_id = ?", (message_id,)
        ).fetchone()
        return str(row[0]) if row else None

    def processed_message(self, message_id: str) -> dict[str, str] | None:
        row = self.connection.execute(
            """
            SELECT imap_uid, outcome
            FROM processed_messages
            WHERE message_id = ?
            """,
            (message_id,),
        ).fetchone()
        if not row:
            return None
        return {"uid": str(row[0]), "outcome": str(row[1])}

    def mark_processed(self, message_id: str, uid: str, outcome: str) -> None:
        self.connection.execute(
            """
            INSERT OR REPLACE INTO processed_messages
                (message_id, imap_uid, outcome, processed_at)
            VALUES (?, ?, ?, ?)
            """,
            (message_id, uid, outcome, datetime.now(timezone.utc).isoformat()),
        )
        self.connection.commit()

    def save_mail_action(
        self,
        message_id: str,
        uid: str,
        snapshot_json: str,
        feishu_record_id: str | None = None,
    ) -> None:
        self.connection.execute(
            """
            INSERT INTO mail_actions
                (message_id, imap_uid, snapshot_json, feishu_record_id, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(message_id) DO UPDATE SET
                imap_uid = excluded.imap_uid,
                snapshot_json = excluded.snapshot_json,
                feishu_record_id = COALESCE(
                    excluded.feishu_record_id,
                    mail_actions.feishu_record_id
                ),
                updated_at = excluded.updated_at
            """,
            (
                message_id,
                uid,
                snapshot_json,
                feishu_record_id,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        self.connection.commit()

    def mail_action(self, message_id: str) -> dict[str, Any] | None:
        row = self.connection.execute(
            """
            SELECT imap_uid, snapshot_json, feishu_record_id
            FROM mail_actions
            WHERE message_id = ?
            """,
            (message_id,),
        ).fetchone()
        if not row:
            return None
        return {
            "uid": str(row[0]),
            "snapshot_json": str(row[1]),
            "feishu_record_id": str(row[2]) if row[2] else None,
        }

    def clear_outcome(self, outcome: str) -> int:
        cursor = self.connection.execute(
            "DELETE FROM processed_messages WHERE outcome = ?", (outcome,)
        )
        self.connection.commit()
        return cursor.rowcount

    def close(self) -> None:
        self.connection.close()
