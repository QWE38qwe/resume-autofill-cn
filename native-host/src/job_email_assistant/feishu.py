from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import Any

import httpx

from .config import Settings

OPEN_API = "https://open.feishu.cn/open-apis"


@dataclass(frozen=True)
class BaseRecord:
    record_id: str
    fields: dict[str, Any]


def normalize_company(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[\s·._\-（）()]+", "", value)
    value = re.sub(r"(?:(?:股份)?有限公司|集团|招聘)$", "", value)
    aliases = {
        "dji大疆": "大疆",
        "dji": "大疆",
        "iflytek": "科大讯飞",
        "讯飞": "科大讯飞",
        "antgroup": "蚂蚁",
        "pdd": "拼多多",
        "pdd拼多多": "拼多多",
        "拼多多集团pdd": "拼多多",
    }
    return aliases.get(value, value)


def has_link_value(value: Any) -> bool:
    if not value:
        return False
    if not isinstance(value, list):
        return True
    for item in value:
        if isinstance(item, str) and item:
            return True
        if not isinstance(item, dict):
            continue
        if item.get("id") or item.get("record_id") or item.get("record_ids"):
            return True
        if item.get("text_arr"):
            return True
    return False


class FeishuBaseClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._token: str | None = None
        self._token_expires_at = 0.0
        self.client = httpx.Client(timeout=30)

    def close(self) -> None:
        self.client.close()

    def _http(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        for attempt in range(3):
            try:
                response = self.client.request(method, url, **kwargs)
                if response.status_code >= 500:
                    response.raise_for_status()
                return response
            except (httpx.TransportError, httpx.HTTPStatusError):
                if attempt == 2:
                    raise
                time.sleep(2**attempt)
        raise RuntimeError("Unreachable retry state")

    def _access_token(self) -> str:
        if self._token and time.time() < self._token_expires_at:
            return self._token
        response = self._http(
            "POST",
            f"{OPEN_API}/auth/v3/tenant_access_token/internal",
            json={
                "app_id": self.settings.feishu_app_id,
                "app_secret": self.settings.feishu_app_secret,
            },
        )
        response.raise_for_status()
        data = response.json()
        if data.get("code") != 0:
            raise RuntimeError(f"Feishu authentication failed: {data.get('msg')}")
        self._token = data["tenant_access_token"]
        self._token_expires_at = time.time() + int(data.get("expire", 7200)) - 120
        return self._token

    def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        response = self._http(
            method,
            f"{OPEN_API}{path}",
            headers={"Authorization": f"Bearer {self._access_token()}"},
            **kwargs,
        )
        try:
            data = response.json()
        except ValueError:
            response.raise_for_status()
            raise RuntimeError("Feishu returned a non-JSON error response")
        if data.get("code") != 0:
            raise RuntimeError(f"Feishu API error {data.get('code')}: {data.get('msg')}")
        response.raise_for_status()
        return data.get("data", {})

    @property
    def _table_path(self) -> str:
        return (
            f"/bitable/v1/apps/{self.settings.feishu_base_token}"
            f"/tables/{self.settings.feishu_table_id}"
        )

    def list_fields(self) -> list[dict[str, Any]]:
        data = self._request(
            "GET", f"{self._table_path}/fields", params={"page_size": 100}
        )
        return data.get("items", [])

    def validate_fields(self) -> None:
        actual = {item["field_name"] for item in self.list_fields()}
        required = {
            self.settings.feishu_company_field,
            self.settings.feishu_note_field,
            self.settings.feishu_assessment_link_field,
            self.settings.feishu_ddl_field,
            self.settings.feishu_parent_field,
            self.settings.feishu_received_at_field,
            self.settings.feishu_subject_field,
        }
        missing = required - actual
        if missing:
            raise ValueError(f"Missing Feishu fields: {', '.join(sorted(missing))}")

    def list_records(self) -> list[BaseRecord]:
        records: list[BaseRecord] = []
        page_token: str | None = None
        while True:
            params: dict[str, Any] = {"page_size": 500}
            if page_token:
                params["page_token"] = page_token
            data = self._request("GET", f"{self._table_path}/records", params=params)
            records.extend(
                BaseRecord(item["record_id"], item.get("fields", {}))
                for item in data.get("items", [])
            )
            if not data.get("has_more"):
                return records
            page_token = data.get("page_token")

    def find_company_parents(
        self, company: str, records: list[BaseRecord] | None = None
    ) -> list[BaseRecord]:
        target = normalize_company(company)
        matches: list[BaseRecord] = []
        for record in records if records is not None else self.list_records():
            value = record.fields.get(self.settings.feishu_company_field)
            parent = record.fields.get(self.settings.feishu_parent_field)
            if (
                value is not None
                and not has_link_value(parent)
                and normalize_company(str(value)) == target
            ):
                matches.append(record)
        return matches

    def create_child_record(
        self,
        parent: BaseRecord,
        company: str,
        subject: str,
        received_at: int,
        note: str,
        assessment_url: str | None,
        deadline: str | None,
    ) -> str:
        fields: dict[str, Any] = {
            self.settings.feishu_company_field: company,
            self.settings.feishu_note_field: note,
            self.settings.feishu_parent_field: [parent.record_id],
            self.settings.feishu_received_at_field: received_at,
            self.settings.feishu_subject_field: subject,
        }
        if assessment_url:
            fields[self.settings.feishu_assessment_link_field] = assessment_url
        if deadline:
            fields[self.settings.feishu_ddl_field] = deadline
        data = self._request(
            "POST",
            f"{self._table_path}/records",
            json={"fields": fields},
        )
        return str(data.get("record", {}).get("record_id") or "")
