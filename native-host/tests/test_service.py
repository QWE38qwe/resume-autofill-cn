from datetime import datetime

from job_email_assistant.feishu import normalize_company
from job_email_assistant.models import Extraction
from job_email_assistant.service import render_deadline, render_note
from job_email_assistant.state import StateStore


def test_company_normalization() -> None:
    assert normalize_company("腾讯招聘") == "腾讯"
    assert normalize_company("DJI 大疆") == "大疆"
    assert normalize_company("讯飞") == "科大讯飞"


def test_note_is_exact_category_only() -> None:
    for category in ("在线测评", "ai面试", "面试邀约"):
        result = Extraction(is_recruitment=True, company="快手", stage=category)
        assert render_note(result) == category


def test_deadline_text_format() -> None:
    result = Extraction(deadline=datetime(2026, 8, 13, 23, 59))
    assert render_deadline(result) == "2026-08-13 23:59"
    assert render_deadline(Extraction()) is None


def test_needs_review_state_can_be_retried(tmp_path) -> None:
    state = StateStore(tmp_path / "state.db")
    try:
        state.mark_processed("<review>", "1", "needs_review")
        state.mark_processed("<updated>", "2", "updated")
        assert state.clear_outcome("needs_review") == 1
        assert state.is_processed("<review>") is False
        assert state.is_processed("<updated>") is True
    finally:
        state.close()
