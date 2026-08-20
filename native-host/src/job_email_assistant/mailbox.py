from __future__ import annotations

import email
import imaplib
import logging
import time
from datetime import datetime, timedelta, timezone
from email.header import decode_header, make_header
from email.message import Message
from email.utils import parsedate_to_datetime
from html import unescape

from bs4 import BeautifulSoup

from .config import Settings
from .models import ParsedEmail

logger = logging.getLogger(__name__)


def recent_messages(
    messages: list[ParsedEmail],
    lookback_hours: int,
    now: datetime | None = None,
) -> list[ParsedEmail]:
    cutoff = (now or datetime.now(timezone.utc)) - timedelta(hours=lookback_hours)
    return sorted(
        (
            message
            for message in messages
            if message.received_at.astimezone(timezone.utc) >= cutoff
        ),
        key=lambda item: item.received_at,
        reverse=True,
    )


def _decode_header(value: str | None) -> str:
    if not value:
        return ""
    return str(make_header(decode_header(value)))


def _message_text(message: Message) -> str:
    plain: list[str] = []
    html: list[str] = []
    parts = message.walk() if message.is_multipart() else [message]
    for part in parts:
        if part.get_content_disposition() == "attachment":
            continue
        content_type = part.get_content_type()
        if content_type not in {"text/plain", "text/html"}:
            continue
        payload = part.get_payload(decode=True)
        if payload is None:
            continue
        charset = part.get_content_charset() or "utf-8"
        try:
            decoded = payload.decode(charset, errors="replace")
        except LookupError:
            decoded = payload.decode("utf-8", errors="replace")
        (plain if content_type == "text/plain" else html).append(decoded)
    soup = BeautifulSoup("\n".join(html), "html.parser")
    html_text = unescape(soup.get_text("\n", strip=True)).strip()
    hrefs = [
        str(anchor["href"]).strip()
        for anchor in soup.select("a[href]")
        if str(anchor["href"]).startswith(("http://", "https://"))
    ]
    sections = ["\n".join(plain).strip()] if plain else [html_text]
    sections.extend(dict.fromkeys(hrefs))
    return "\n".join(section for section in sections if section).strip()


def parse_message(raw: bytes, uid: str = "") -> ParsedEmail:
    message = email.message_from_bytes(raw)
    received_at = parsedate_to_datetime(message.get("Date")) if message.get("Date") else None
    if received_at is None:
        received_at = datetime.now(timezone.utc)
    elif received_at.tzinfo is None:
        received_at = received_at.replace(tzinfo=timezone.utc)
    message_id = message.get("Message-ID", "").strip() or f"imap-uid:{uid}"
    return ParsedEmail(
        message_id=message_id,
        uid=uid,
        subject=_decode_header(message.get("Subject")),
        sender=_decode_header(message.get("From")),
        received_at=received_at,
        text=_message_text(message),
    )


class ImapMailbox:
    def __init__(self, settings: Settings):
        self.settings = settings

    def fetch_recent(self) -> list[ParsedEmail]:
        for attempt in range(3):
            try:
                return self._fetch_recent_once()
            except (imaplib.IMAP4.abort, OSError):
                if attempt == 2:
                    raise
                logger.warning("Transient IMAP failure, retrying (%d/3)", attempt + 1)
                time.sleep(2**attempt)
        raise RuntimeError("Unreachable retry state")

    def fetch_by_uid(self, uid: str) -> ParsedEmail | None:
        if not uid:
            return None
        for attempt in range(3):
            try:
                return self._fetch_by_uid_once(uid)
            except (imaplib.IMAP4.abort, OSError):
                if attempt == 2:
                    raise
                logger.warning("Transient IMAP failure, retrying (%d/3)", attempt + 1)
                time.sleep(2**attempt)
        raise RuntimeError("Unreachable retry state")

    def _fetch_by_uid_once(self, uid: str) -> ParsedEmail | None:
        with imaplib.IMAP4_SSL(
            self.settings.mail_host, self.settings.mail_port
        ) as client:
            client.login(self.settings.mail_address, self.settings.mail_auth_code)
            status, _ = client.select(self.settings.mail_folder, readonly=True)
            if status != "OK":
                raise RuntimeError(f"Unable to select folder: {self.settings.mail_folder}")
            status, payload = client.uid("fetch", uid, "(RFC822)")
            if status != "OK" or not payload or not isinstance(payload[0], tuple):
                return None
            return parse_message(payload[0][1], uid)

    def _fetch_recent_once(self) -> list[ParsedEmail]:
        now = datetime.now(timezone.utc)
        since = (now - timedelta(hours=self.settings.mail_lookback_hours)).strftime(
            "%d-%b-%Y"
        )
        logger.info("Connecting to IMAP host %s", self.settings.mail_host)
        with imaplib.IMAP4_SSL(
            self.settings.mail_host, self.settings.mail_port
        ) as client:
            client.login(self.settings.mail_address, self.settings.mail_auth_code)
            try:
                imaplib.Commands.setdefault("ID", ("AUTH", "SELECTED"))
                client._simple_command(  # type: ignore[attr-defined]
                    "ID",
                    '("name" "job-email-assistant" "version" "0.1.0" "vendor" "local")',
                )
            except imaplib.IMAP4.error:
                logger.debug("IMAP server does not accept the optional ID command")
            status, _ = client.select(self.settings.mail_folder, readonly=True)
            if status != "OK":
                raise RuntimeError(f"Unable to select folder: {self.settings.mail_folder}")
            status, result = client.uid("search", None, "SINCE", since)
            if status != "OK":
                raise RuntimeError("IMAP search failed")
            messages: list[ParsedEmail] = []
            for uid_bytes in result[0].split():
                uid = uid_bytes.decode()
                status, payload = client.uid("fetch", uid, "(RFC822)")
                if status != "OK" or not payload or not isinstance(payload[0], tuple):
                    logger.warning("Skipping unreadable IMAP UID %s", uid)
                    continue
                messages.append(parse_message(payload[0][1], uid))
            return recent_messages(messages, self.settings.mail_lookback_hours, now)
