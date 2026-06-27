"""
Case study configs — what queries to track, what domain to look for, what
AI Mode prompts to test.

Add a new case study by appending to CASE_STUDIES. Pattern: one entry per
client × page being optimized.
"""

from dataclasses import dataclass, field
from typing import List

from client_configs import LolaClientConfig, get_client_config


@dataclass
class CaseStudy:
    slug: str
    client_name: str
    target_url: str
    target_domain: str  # what we match against in search results (e.g. "sandbarsoftwash.com")
    google_queries: List[str] = field(default_factory=list)
    ai_mode_prompts: List[str] = field(default_factory=list)
    # Verified wins shown in the Top Wins card alongside the auto-tracked
    # rankings. Use these for confirmed wins that the Custom Search API
    # can't always catch (map pack rankings, geo-localized SERP variations,
    # AI Overview placements, etc.). Each entry is a short headline like
    # "Tarpon Springs — soft wash" or "Holiday — pressure washing".
    verified_organic_wins: List[str] = field(default_factory=list)
    verified_map_pack_wins: List[str] = field(default_factory=list)


def _case_study_from_client_config(slug: str) -> CaseStudy:
    config: LolaClientConfig | None = get_client_config(slug)
    if not config:
        raise RuntimeError(f"Missing client config for {slug}")
    return CaseStudy(
        slug=config.slug,
        client_name=config.client_name,
        target_url=config.website,
        target_domain=config.target_domain,
        google_queries=list(config.tracking.google_queries),
        ai_mode_prompts=list(config.tracking.ai_mode_prompts),
        verified_organic_wins=list(config.tracking.verified_organic_wins),
        verified_map_pack_wins=list(config.tracking.verified_map_pack_wins),
    )


CASE_STUDIES: dict[str, CaseStudy] = {
    # Clean client-facing slug → share https://lola.tyalexandermedia.com/r/client/sandbar
    # Tracks the whole Sandbar business (not just the roof-cleaning page).
    # Renders the dashboard shell immediately; ranking lines + AI Share of
    # Voice populate after the first snapshot:
    #   POST /admin/case-study/sandbar/run   (X-Admin-Key header)
    "sandbar": _case_study_from_client_config("sandbar"),
    # Separate client-facing dashboard for Tampa Bay Power Clean.
    # Share: https://lola.tyalexandermedia.com/r/client/tampa-bay-power-clean
    # Admin snapshot:
    #   POST /admin/case-study/tampa-bay-power-clean/run   (X-Admin-Key header)
    "tampa-bay-power-clean": _case_study_from_client_config("tampa-bay-power-clean"),
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
