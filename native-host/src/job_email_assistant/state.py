from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path


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
        self.connection.commit()

    def is_processed(self, message_id: str) -> bool:
        return self.processed_outcome(message_id) is not None

    def processed_outcome(self, message_id: str) -> str | None:
        row = self.connection.execute(
            "SELECT outcome FROM processed_messages WHERE message_id = ?", (message_id,)
        ).fetchone()
        return str(row[0]) if row else None

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

    def clear_outcome(self, outcome: str) -> int:
        cursor = self.connection.execute(
            "DELETE FROM processed_messages WHERE outcome = ?", (outcome,)
        )
        self.connection.commit()
        return cursor.rowcount

    def close(self) -> None:
        self.connection.close()
