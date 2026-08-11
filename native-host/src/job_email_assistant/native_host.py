from __future__ import annotations

import json
import logging
import struct
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any, BinaryIO

from . import __version__
from .config import Settings
from .service import SyncService
from .state import StateStore

ROOT = Path(__file__).resolve().parents[2]
STATE_DB = ROOT / "data" / "state.db"


def read_message(stream: BinaryIO) -> dict[str, Any] | None:
    raw_length = stream.read(4)
    if not raw_length:
        return None
    if len(raw_length) != 4:
        raise ValueError("Invalid Native Messaging frame header")
    length = struct.unpack("<I", raw_length)[0]
    if length > 8 * 1024 * 1024:
        raise ValueError("Native Messaging request is too large")
    payload = stream.read(length)
    if len(payload) != length:
        raise ValueError("Incomplete Native Messaging frame")
    value = json.loads(payload.decode("utf-8"))
    if not isinstance(value, dict):
        raise ValueError("Native Messaging request must be an object")
    return value


def write_message(stream: BinaryIO, value: dict[str, Any]) -> None:
    payload = json.dumps(value, ensure_ascii=False).encode("utf-8")
    stream.write(struct.pack("<I", len(payload)))
    stream.write(payload)
    stream.flush()


def handle(message: dict[str, Any]) -> dict[str, Any]:
    action = message.get("action")
    if action == "ping":
        return {"ok": True, "version": __version__}
    if action == "retryReview":
        state = StateStore(STATE_DB)
        try:
            count = state.clear_outcome("needs_review")
        finally:
            state.close()
        return {"ok": True, "cleared": count}
    if action != "sync":
        raise ValueError(f"Unsupported action: {action}")

    settings = Settings.from_payload(message, STATE_DB)
    service = SyncService(settings)
    try:
        summary = service.run_once()
    finally:
        service.close()
    return {"ok": True, "summary": asdict(summary)}


def main() -> int:
    logging.basicConfig(
        stream=sys.stderr,
        level=logging.WARNING,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    while True:
        try:
            message = read_message(sys.stdin.buffer)
            if message is None:
                return 0
            response = handle(message)
        except Exception as error:
            logging.exception("Native host request failed")
            response = {"ok": False, "error": str(error)[:500]}
        write_message(sys.stdout.buffer, response)


if __name__ == "__main__":
    raise SystemExit(main())
