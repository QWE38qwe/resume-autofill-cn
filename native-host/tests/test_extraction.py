from dataclasses import replace
from datetime import datetime, timedelta, timezone

import pytest

from job_email_assistant.extractors import (
    _clean_company,
    _json_object,
    _parse_deadline,
    extract_with_rules,
)
from job_email_assistant.mailbox import parse_message, recent_messages
from job_email_assistant.models import ParsedEmail


def message(subject: str, text: str = "", sender: str = "campus@example.com") -> ParsedEmail:
    return ParsedEmail(
        message_id=f"<{subject}>",
        uid="1",
        subject=subject,
        sender=sender,
        received_at=datetime(2026, 8, 10, 10, 0, tzinfo=timezone.utc),
        text=text,
    )


def test_parse_html_message_preserves_anchor_url() -> None:
    raw = (
        b"Subject: assessment\r\n"
        b"From: campus@example.com\r\n"
        b"Date: Mon, 10 Aug 2026 10:00:00 +0800\r\n"
        b"Message-ID: <mail-1@example.com>\r\n"
        b"Content-Type: text/html; charset=utf-8\r\n\r\n"
        b'<p>Hello<br><a href="https://assessment.example.com/1">open</a></p>'
    )
    result = parse_message(raw, "42")
    assert result.message_id == "<mail-1@example.com>"
    assert "https://assessment.example.com/1" in result.text


def test_representative_assessment_email() -> None:
    result = extract_with_rules(
        message(
            "【讯飞招聘】测评通知：科大讯飞邀请您参与校园招聘在线测评",
            "请于2026年8月13日 23:59前完成笔试。"
            "https://assessment.example.com/exam/123",
            "campus@iflytek.com",
        )
    )
    assert result.is_recruitment is True
    assert result.company == "科大讯飞"
    assert result.stage == "在线测评"
    assert result.deadline == datetime(2026, 8, 13, 23, 59)
    assert result.assessment_url.endswith("/exam/123")


@pytest.mark.parametrize(
    ("subject", "text", "category"),
    [
        ("AI面试邀请", "请在48小时内完成AI面试", "ai面试"),
        ("来自字节跳动的面试邀请", "请参加视频面试", "面试邀约"),
        ("在线笔试通知", "邀请您完成在线笔试", "在线测评"),
    ],
)
def test_only_three_categories(subject: str, text: str, category: str) -> None:
    result = extract_with_rules(message(subject, text))
    assert result.is_recruitment is True
    assert result.stage == category


@pytest.mark.parametrize(
    "subject",
    [
        "您的简历投递成功",
        "简历创建成功",
        "校园招聘正式启动",
        "诚邀加入校招就业群",
        "邮箱验证码",
        "在线笔试结果通知",
    ],
)
def test_non_action_mail_is_ignored(subject: str) -> None:
    result = extract_with_rules(message(subject, "候选人信息已记录"))
    assert result.is_recruitment is False
    assert result.stage is None


def test_application_invitation_with_process_description_is_ignored() -> None:
    result = extract_with_rules(
        message(
            "国联证券2026暑期实习生招聘-诚邀您投递简历！",
            "招聘流程包括简历筛选、在线测评和面试，请尽快投递简历。",
        )
    )
    assert result.is_recruitment is False


def test_job_marketing_with_interview_process_is_ignored() -> None:
    result = extract_with_rules(
        message(
            "欢迎投递 DJI 大疆 2027 校园招聘职位",
            "招聘流程包含简历筛选、在线测评和面试，请关注后续通知。",
        )
    )
    assert result.is_recruitment is False


def test_deadline_from_received_time_and_validity() -> None:
    base = datetime(2026, 8, 10, 10, 0, tzinfo=timezone.utc)
    assert _parse_deadline("收到邮件后48小时内", base) == datetime(2026, 8, 12, 10, 0)
    assert _parse_deadline("有效期为3天", base) == datetime(2026, 8, 13, 10, 0)
    assert _parse_deadline("面试时间：2026年8月15日 14:00", base) is None


def test_llm_json_code_fence_is_supported() -> None:
    assert _json_object('```json\n{"company":"百度"}\n```') == {"company": "百度"}


def test_llm_company_value_is_cleaned() -> None:
    assert _clean_company("51job") is None
    assert _clean_company("iTalent") is None
    assert _clean_company("careers") is None
    assert _clean_company("拼多多集团PDD校招") == "拼多多"
    assert _clean_company("网易游戏雷火｜27届秋招") == "网易雷火"


def test_recent_messages_filters_exact_hours_and_sorts_descending() -> None:
    now = datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc)
    recent = replace(message("最近"), received_at=now - timedelta(hours=1))
    boundary = replace(message("边界"), received_at=now - timedelta(hours=24))
    expired = replace(
        message("过期"), received_at=now - timedelta(hours=24, seconds=1)
    )

    result = recent_messages([boundary, expired, recent], 24, now)

    assert [item.subject for item in result] == ["最近", "边界"]
