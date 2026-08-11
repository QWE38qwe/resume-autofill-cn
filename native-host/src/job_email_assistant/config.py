from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def _bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    mail_address: str
    mail_auth_code: str
    mail_host: str
    mail_port: int
    mail_folder: str
    mail_lookback_days: int
    llm_base_url: str
    llm_api_key: str
    llm_model: str
    llm_timeout_seconds: float
    feishu_app_id: str
    feishu_app_secret: str
    feishu_base_token: str
    feishu_table_id: str
    feishu_company_field: str
    feishu_note_field: str
    feishu_assessment_link_field: str
    feishu_ddl_field: str
    poll_interval_minutes: int
    state_db_path: Path
    log_level: str
    dry_run: bool

    @classmethod
    def from_env(
        cls, env_file: str | Path | None = ".env", require_mail: bool = True
    ) -> "Settings":
        if env_file:
            load_dotenv(env_file)
        mail_address = _required("MAIL_ADDRESS") if require_mail else os.getenv("MAIL_ADDRESS", "")
        mail_auth_code = (
            _required("MAIL_AUTH_CODE") if require_mail else os.getenv("MAIL_AUTH_CODE", "")
        )
        return cls(
            mail_address=mail_address,
            mail_auth_code=mail_auth_code,
            mail_host=os.getenv("MAIL_HOST", "imap.126.com"),
            mail_port=int(os.getenv("MAIL_PORT", "993")),
            mail_folder=os.getenv("MAIL_FOLDER", "INBOX"),
            mail_lookback_days=int(os.getenv("MAIL_LOOKBACK_DAYS", "7")),
            llm_base_url=_required("LLM_BASE_URL").rstrip("/"),
            llm_api_key=_required("LLM_API_KEY"),
            llm_model=_required("LLM_MODEL"),
            llm_timeout_seconds=float(os.getenv("LLM_TIMEOUT_SECONDS", "60")),
            feishu_app_id=_required("FEISHU_APP_ID"),
            feishu_app_secret=_required("FEISHU_APP_SECRET"),
            feishu_base_token=_required("FEISHU_BASE_TOKEN"),
            feishu_table_id=_required("FEISHU_TABLE_ID"),
            feishu_company_field=os.getenv("FEISHU_COMPANY_FIELD", "公司"),
            feishu_note_field=os.getenv("FEISHU_NOTE_FIELD", "note"),
            feishu_assessment_link_field=os.getenv(
                "FEISHU_ASSESSMENT_LINK_FIELD", "测评链接"
            ),
            feishu_ddl_field=os.getenv("FEISHU_DDL_FIELD", "ddl"),
            poll_interval_minutes=int(os.getenv("POLL_INTERVAL_MINUTES", "120")),
            state_db_path=Path(os.getenv("STATE_DB_PATH", "./data/state.db")).expanduser(),
            log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
            dry_run=_bool("DRY_RUN"),
        )

    @classmethod
    def from_payload(cls, payload: dict[str, Any], state_db_path: Path) -> "Settings":
        mail = payload.get("mail") or {}
        ai = payload.get("ai") or {}
        feishu = payload.get("feishu") or {}

        def required(section: dict[str, Any], key: str, label: str) -> str:
            value = str(section.get(key) or "").strip()
            if not value:
                raise ValueError(f"缺少配置：{label}")
            return value

        return cls(
            mail_address=required(mail, "address", "邮箱地址"),
            mail_auth_code=required(mail, "authCode", "邮箱客户端授权码"),
            mail_host=str(mail.get("host") or "imap.126.com").strip(),
            mail_port=int(mail.get("port") or 993),
            mail_folder=str(mail.get("folder") or "INBOX").strip(),
            mail_lookback_days=7,
            llm_base_url=required(ai, "apiBase", "AI API 地址").rstrip("/"),
            llm_api_key=required(ai, "apiKey", "AI API Key"),
            llm_model=required(ai, "model", "AI 模型"),
            llm_timeout_seconds=float(ai.get("timeoutSeconds") or 60),
            feishu_app_id=required(feishu, "appId", "飞书 App ID"),
            feishu_app_secret=required(feishu, "appSecret", "飞书 App Secret"),
            feishu_base_token=required(feishu, "baseToken", "飞书 Base Token"),
            feishu_table_id=required(feishu, "tableId", "飞书 Table ID"),
            feishu_company_field=str(feishu.get("companyField") or "公司"),
            feishu_note_field=str(feishu.get("noteField") or "note"),
            feishu_assessment_link_field=str(
                feishu.get("assessmentLinkField") or "测评链接"
            ),
            feishu_ddl_field=str(feishu.get("ddlField") or "ddl"),
            poll_interval_minutes=max(30, int(payload.get("pollIntervalMinutes") or 120)),
            state_db_path=state_db_path,
            log_level="WARNING",
            dry_run=bool(payload.get("dryRun", False)),
        )
