"""
Tier playbooks + onboarding helpers.

When a new retainer client is created via the admin UI, we seed two things
out of this module:

  1. A starting task list for the public dashboard's "Work Delivered" feed
     (per tier — Starter / Growth / Pro). One source of truth.
  2. Sensible default money_keywords + ai_mode_prompts derived from the
     client's service type + city. The operator can edit them after.

Edit this file to change every future client's onboarding in one place.
"""

from __future__ import annotations
from typing import List, TypedDict


# ── Tier playbooks ────────────────────────────────────────────────
#
# Task shape: (title, category, status). Categories follow db.reporting:
#   content | citation | review | gbp | fix | other
# Statuses follow db.reporting:
#   done | in_progress | next_up
#
# Convention: seed everything as `next_up` so the dashboard starts honest —
# the operator marks items `done` as work actually ships. Mirrors the
# feature lists on /pricing so the dashboard matches what was sold.


class PlaybookTask(TypedDict):
    title: str
    category: str
    status: str


FOUNDATION_PLAYBOOK: List[PlaybookTask] = [
    {"title": "Full Lola audit + priority fix list", "category": "fix", "status": "next_up"},
    {"title": "Google Business Profile optimization (categories, services, hours, photos)", "category": "gbp", "status": "next_up"},
    {"title": "Citation + directory cleanup (NAP consistency)", "category": "citation", "status": "next_up"},
    {"title": "On-page SEO fixes — titles, meta, schema, speed", "category": "fix", "status": "next_up"},
    {"title": "Review-generation system set up (SMS/email request flow)", "category": "review", "status": "next_up"},
    {"title": "AI search visibility baseline (ChatGPT, Perplexity, Gemini)", "category": "other", "status": "next_up"},
    {"title": "First monthly progress report scheduled", "category": "other", "status": "next_up"},
]

GROWTH_PLAYBOOK: List[PlaybookTask] = FOUNDATION_PLAYBOOK + [
    {"title": "Monthly content piece — service-area focus", "category": "content", "status": "next_up"},
    {"title": "Link building — local + industry citations", "category": "citation", "status": "next_up"},
    {"title": "Weekly GMB posts (4 / month)", "category": "gbp", "status": "next_up"},
    {"title": "Ongoing citation building + new directory submissions", "category": "citation", "status": "next_up"},
    {"title": "AI Search Visibility tracking (20 prompts/mo)", "category": "other", "status": "next_up"},
    {"title": "Bi-weekly performance report", "category": "other", "status": "next_up"},
]

SCALE_PLAYBOOK: List[PlaybookTask] = GROWTH_PLAYBOOK + [
    {"title": "Live AI citation tracking (ChatGPT, Perplexity, Gemini, Google AI)", "category": "other", "status": "next_up"},
    {"title": "Multi-location / service-area expansion pages", "category": "content", "status": "next_up"},
    {"title": "Monthly 1-on-1 strategy call with Coach Ty", "category": "other", "status": "next_up"},
    {"title": "Competitor + lead-list CSV export delivered", "category": "other", "status": "next_up"},
]

# Roadmap stages (source of truth: docs/PRICING.md). Legacy tier names
# (starter/pro) kept as aliases so older client records still seed correctly.
PLAYBOOKS: dict[str, List[PlaybookTask]] = {
    "foundation": FOUNDATION_PLAYBOOK,
    "growth": GROWTH_PLAYBOOK,
    "scale": SCALE_PLAYBOOK,
    # Back-compat aliases
    "starter": FOUNDATION_PLAYBOOK,
    "pro": SCALE_PLAYBOOK,
}


def get_playbook(tier: str) -> List[PlaybookTask]:
    """Returns a copy so callers can't mutate the module-level list."""
    tier = (tier or "").strip().lower()
    return [dict(t) for t in PLAYBOOKS.get(tier, [])]  # type: ignore[arg-type,misc]


# ── Default keywords + AI prompts from (service, city) ────────────


def suggest_money_keywords(service: str, city: str, limit: int = 5) -> List[str]:
    """
    Five high-intent local queries a buyer would actually type. We tailor
    a few patterns by service when the standard "{service} {city}" wouldn't
    capture the real intent (e.g. plumbing's emergency search). Operator
    can still edit before saving.
    """
    s = (service or "").strip()
    c = (city or "").strip()
    if not s or not c:
        return []

    sl = s.lower()
    base = [
        f"{s} {c}",
        f"{s} near me",
        f"best {s} {c}",
        f"{s} {c} cost",
        f"{s} company {c}",
    ]
    # Emergency-intent overlays for trades where it's the dominant query.
    if any(k in sl for k in ("plumb", "hvac", "roof", "lock", "tow", "tree")):
        base = [
            f"emergency {s} {c}",
            f"24 hour {s} {c}",
            f"{s} near me",
            f"{s} {c}",
            f"best {s} {c}",
        ]
    return base[:limit]


def suggest_ai_mode_prompts(service: str, city: str, limit: int = 3) -> List[str]:
    """
    Prompts we feed Claude/ChatGPT-style "AI Mode" to see whether the
    client is recommended (or which competitor is, instead).
    """
    s = (service or "").strip()
    c = (city or "").strip()
    if not s or not c:
        return []
    return [
        f"What's the best {s} company in {c}?",
        f"Recommend a {s} business near {c}.",
        f"Who should I hire for {s} in {c}?",
    ][:limit]
