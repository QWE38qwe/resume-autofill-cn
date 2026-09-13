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


def test_suspicious_company_requires_review():
    assert company_needs_review("message")
    assert not company_needs_review("岚图汽车")
