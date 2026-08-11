from __future__ import annotations

import argparse
import json
import logging
import time
from dataclasses import asdict
from pathlib import Path

from .config import Settings
from .extractors import extract_with_rules
from .feishu import FeishuBaseClient
from .mailbox import parse_message
from .service import SyncService
from .state import StateStore


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="job-email-assistant",
        description="Extract recruitment tasks from email and update Feishu Base.",
    )
    parser.add_argument("--env-file", default=".env", help="Path to dotenv file")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("doctor", help="Validate configuration and Feishu fields")
    subparsers.add_parser("sync", help="Fetch and process email once")
    subparsers.add_parser("watch", help="Run sync periodically")
    subparsers.add_parser(
        "retry-review", help="Allow needs-review messages to be processed again"
    )
    parse_eml = subparsers.add_parser("parse-eml", help="Parse a local EML without LLM")
    parse_eml.add_argument("path", type=Path)
    return parser


def _configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def _doctor(settings: Settings) -> int:
    client = FeishuBaseClient(settings)
    try:
        client.validate_fields()
    finally:
        client.close()
    print("OK: configuration loaded and Feishu fields are accessible")
    return 0


def _sync(settings: Settings) -> int:
    service = SyncService(settings)
    try:
        summary = service.run_once()
    finally:
        service.close()
    print(json.dumps(asdict(summary), ensure_ascii=False))
    return 1 if summary.failed else 0


def main() -> int:
    args = _parser().parse_args()
    if args.command == "parse-eml":
        message = parse_message(args.path.read_bytes(), uid="fixture")
        result = extract_with_rules(message)
        print(json.dumps(asdict(result), ensure_ascii=False, default=str, indent=2))
        return 0

    settings = Settings.from_env(args.env_file, require_mail=args.command != "doctor")
    _configure_logging(settings.log_level)
    if args.command == "doctor":
        return _doctor(settings)
    if args.command == "retry-review":
        state = StateStore(settings.state_db_path)
        try:
            count = state.clear_outcome("needs_review")
        finally:
            state.close()
        print(f"Cleared {count} needs-review messages")
        return 0
    if args.command == "sync":
        return _sync(settings)
    if args.command == "watch":
        while True:
            try:
                _sync(settings)
            except Exception:
                logging.exception("Sync cycle failed")
            time.sleep(settings.poll_interval_minutes * 60)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
