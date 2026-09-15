from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class ParsedEmail:
    message_id: str
    uid: str
    subject: str
    sender: str
    received_at: datetime
    text: str
    # 保留少量邮件头，供系统回执/自动回复硬过滤使用；正文仍视为不可信数据。
    headers: dict[str, str] = field(default_factory=dict)


@dataclass
class Extraction:
    is_recruitment: bool = False
    company: str | None = None
    position: str | None = None
    stage: str | None = None
    deadline: datetime | None = None
    assessment_url: str | None = None
    confidence: int = 0
    needs_review: bool = False
    evidence: list[str] = field(default_factory=list)
    company_source: str | None = None
    company_confidence: int = 0

    def merge_missing(self, other: "Extraction") -> "Extraction":
        for name in (
            "company",
            "position",
            "stage",
            "deadline",
            "assessment_url",
        ):
            if getattr(self, name) is None:
                setattr(self, name, getattr(other, name))
        # 分类准入由 service 在字段合并前决定；补字段不能把非任务提升为任务。
        self.confidence = max(self.confidence, other.confidence)
        self.needs_review = self.needs_review or other.needs_review
        self.evidence.extend(item for item in other.evidence if item not in self.evidence)
        if self.company_source is None:
            self.company_source = other.company_source
        self.company_confidence = max(self.company_confidence, other.company_confidence)
        return self
