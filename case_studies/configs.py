"""
Case study configs — what queries to track, what domain to look for, what
AI Mode prompts to test.

Add a new case study by appending to CASE_STUDIES. Pattern: one entry per
client × page being optimized.
"""

from dataclasses import dataclass, field
from typing import List


@dataclass
class CaseStudy:
    slug: str
    client_name: str
    target_url: str
    target_domain: str  # what we match against in search results (e.g. "sandbarsoftwash.com")
    google_queries: List[str] = field(default_factory=list)
    ai_mode_prompts: List[str] = field(default_factory=list)


CASE_STUDIES: dict[str, CaseStudy] = {
    # The first real Lola case study — Coach Ty's father's operation.
    # Day 0: 2026-05-25. Day 30 target: 2026-06-23.
    "sandbar-roof-cleaning": CaseStudy(
        slug="sandbar-roof-cleaning",
        client_name="Sandbar Soft Wash",
        target_url="https://www.sandbarsoftwash.com/roof-cleaning",
        target_domain="sandbarsoftwash.com",
        google_queries=[
            "roof cleaning palm harbor fl",
            "soft wash roof cleaning palm harbor",
            "shingle roof cleaning pinellas county",
            "tile roof cleaning clearwater fl",
            "best roof cleaner near palm harbor",
            "roof cleaning cost florida",
        ],
        ai_mode_prompts=[
            "Who's the best roof cleaner near Palm Harbor, Florida? List 3 companies.",
            "I need someone to clean my shingle roof in Pinellas County, FL. Recommend a contractor.",
            "Best soft wash roof cleaning company in Palm Harbor FL?",
        ],
    ),
}


def get_case_study(slug: str) -> CaseStudy | None:
    return CASE_STUDIES.get(slug)
