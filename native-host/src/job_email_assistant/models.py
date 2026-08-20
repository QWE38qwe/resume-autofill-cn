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
        self.is_recruitment = self.is_recruitment or other.is_recruitment
        self.confidence = max(self.confidence, other.confidence)
        self.needs_review = self.needs_review or other.needs_review
        self.evidence.extend(item for item in other.evidence if item not in self.evidence)
        return self
