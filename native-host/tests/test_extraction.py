from datetime import datetime

from job_email_assistant.extractors import company_needs_review, extract_with_rules, normalize_company
from job_email_assistant.models import ParsedEmail


def mail(subject: str, text: str = "") -> ParsedEmail:
    return ParsedEmail("m1", "1", subject, "hr@example.com", datetime(2026, 9, 13, 10), text)


def test_company_aliases_and_normalization():
    assert normalize_company("岚图") == "岚图汽车"
    assert normalize_company("voyah") == "岚图汽车"
    assert normalize_company("招商") == "招商银行"
    assert normalize_company("招商银行（中国）有限公司") == "招商银行"


def test_title_company_beats_sender_noise():
    result = extract_with_rules(mail("岚图汽车在线测评邀请", "请在 2026-09-15 18:00 前完成测评"))
    assert result.company == "岚图汽车"
    assert result.company != "voyah"


def test_sina_ai_interview_reminder_is_kept_as_task():
    result = extract_with_rules(mail(
        "新浪管培AI面试提醒",
        "面试时间：2026-09-15 18:00 https://app.mokahr.com/campus-recruitment/sina/4112",
    ))
    assert result.is_recruitment
    assert result.stage == "ai面试"
    assert result.company == "新浪"


def test_sina_recruitment_url_resolves_company():
    result = extract_with_rules(mail(
        "AI面试提醒",
        "面试时间：2026-09-15 18:00 https://app.mokahr.com/campus-recruitment/sina/4112",
    ))
    assert result.company == "新浪"


def test_sina_campus_apply_url_resolves_company():
    result = extract_with_rules(mail(
        "AI面试提醒",
        "面试时间：2026-09-15 18:00 https://app.mokahr.com/campus_apply/sina/4112#/candidateHome/resume",
    ))
    assert result.is_recruitment
    assert result.stage == "ai面试"
    assert result.company == "新浪"


def test_suspicious_company_requires_review():
    assert company_needs_review("message")
    assert not company_needs_review("岚图汽车")


def test_scheduled_send_receipt_is_not_a_task_even_when_body_mentions_assessment():
    result = extract_with_rules(mail(
        "[通知] 您的定时邮件发送成功了",
        "本地去重记录已存在，本次同步已跳过。原邮件内容：请完成在线测评。",
    ))
    assert not result.is_recruitment
    assert result.stage is None


def test_process_description_is_not_a_task():
    result = extract_with_rules(mail(
        "流程说明：在线测评流程",
        "本文介绍在线测评的流程、常见问题和操作说明，不要求你现在完成任务。",
    ))
    assert not result.is_recruitment


def test_delivery_receipt_with_new_explicit_assessment_action_is_kept():
    result = extract_with_rules(mail(
        "投递成功后请完成在线测评",
        "请在 2026-09-18 18:00 前完成测评。",
    ))
    assert result.is_recruitment
    assert result.stage == "在线测评"


def test_quoted_invitation_does_not_create_task_without_current_action():
    result = extract_with_rules(mail(
        "Re: 面试沟通",
        "收到，谢谢。\n\n原邮件：请参加 AI 面试，面试时间 2026-09-18 10:00。",
    ))
    assert not result.is_recruitment
