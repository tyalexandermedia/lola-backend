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
    # Clean client-facing slug → share https://lola.tyalexandermedia.com/r/client/sandbar
    # Tracks the whole Sandbar business (not just the roof-cleaning page).
    # Renders the dashboard shell immediately; ranking lines + AI Share of
    # Voice populate after the first snapshot:
    #   POST /admin/case-study/sandbar/run   (X-Admin-Key header)
    "sandbar": CaseStudy(
        slug="sandbar",
        client_name="Sandbar Soft Wash",
        target_url="https://www.sandbarsoftwash.com",
        target_domain="sandbarsoftwash.com",
        google_queries=[
            "pressure washing palm harbor fl",
            "soft wash palm harbor",
            "house washing palm harbor fl",
            "roof cleaning palm harbor fl",
            "paver sealing palm harbor",
            "best pressure washing near palm harbor",
        ],
        ai_mode_prompts=[
            "Who's the best pressure washing company near Palm Harbor, Florida? List 3.",
            "Recommend a soft wash / house washing company in Palm Harbor, FL.",
            "Best roof cleaning company in Palm Harbor FL?",
        ],
    ),
    # The original page-level case study — Coach Ty's father's operation.
    # Day 0: 2026-05-25. Day 30 target: 2026-06-23. Kept for granular
    # roof-cleaning-page tracking (internal); 'sandbar' above is the
    # client-facing dashboard.
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
