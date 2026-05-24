# ============================================================
# LOLA SEO BACKEND — 2026 EDITION (Phase 1)
# Home services SEO audit engine
# ============================================================

import os
import uuid
import asyncio
import hashlib
import hmac
import json
import traceback
from pathlib import Path
from datetime import datetime
from typing import Optional, List

# CRITICAL: load_dotenv MUST run before any project module is imported. Many
# of our modules (api_clients.google_apis, outreach.sender, etc.) read env
# vars at module-load time, so the .env values need to be in os.environ
# before those import statements execute. Reordering this caused unsubscribe
# tokens to return 403 and Google API calls to silently no-op even when keys
# were set in .env.
from dotenv import load_dotenv

dotenv_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=dotenv_path)
print(f"Loaded .env from {dotenv_path} (exists={dotenv_path.exists()})")

import httpx
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db.database import (
    init_db,
    save_audit,
    get_percentile,
    get_recent_leads,
    get_audit_by_id,
)
from db.leads import (
    init_leads_table,
    upsert_lead,
    get_warm_leads,
    classify_temperature,
)
from db.pricing import (
    init_pricing_table,
    get_founding_count,
    record_founding_signup,
    standard_price_for_count,
    FOUNDING_CAP,
)
from db.api_cache import (
    init_cache_table,
    cache_stats,
    cache_purge_expired,
    audits_today_count,
)
from api_clients.google_apis import (
    API_STATUS,
    ApiBudget,
    get_page_speed,
    get_safe_browsing,
    get_business_info,
    get_competitors,
)
from db.outreach import (
    init_outreach_tables,
    suppress as suppress_email,
    mark_audit_submitted,
    mark_event,
    mark_replied,
    stats as outreach_stats,
    recent_sends as outreach_recent_sends,
)
from outreach.sender import make_unsub_token

app = FastAPI(title="Lola SEO", version="4.0")

origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://lola.tyalexandermedia.com",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    await init_db()
    await init_leads_table()
    await init_pricing_table()
    await init_cache_table()
    await init_outreach_tables()
    await cache_purge_expired()


GOOGLE_PAGESPEED_KEY = os.getenv("GOOGLE_PAGESPEED_API_KEY", "").strip() or None
GOOGLE_PLACES_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "").strip() or None
GOOGLE_SAFE_BROWSING_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY", "").strip() or None
GOOGLE_CUSTOM_SEARCH_KEY = os.getenv("GOOGLE_CUSTOM_SEARCH_API_KEY", "").strip() or None
GOOGLE_CUSTOM_SEARCH_CX = os.getenv("GOOGLE_CUSTOM_SEARCH_CX", "").strip() or None
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip() or None
BREVO_LIST_ID = os.getenv("BREVO_LIST_ID", "2").strip()
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip() or None
AUDIT_FROM_EMAIL = os.getenv(
    "AUDIT_FROM_EMAIL", "Coach Ty (Lola) <ty@tyalexandermedia.com>"
).strip()
AUDIT_REPLY_TO_EMAIL = os.getenv(
    "AUDIT_REPLY_TO_EMAIL", "ty@tyalexandermedia.com"
).strip()
PUBLIC_APP_URL = os.getenv("PUBLIC_APP_URL", "https://lola.tyalexandermedia.com").rstrip("/")

# Stripe Payment Link URLs used in the audit-confirmation email upsell.
# Same as VITE_STRIPE_*_URL on the frontend — env-overridable so they can be
# swapped per environment without code changes. Defaults are the live prod links.
STRIPE_DIY_URL = os.getenv(
    "STRIPE_DIY_URL", "https://buy.stripe.com/14A7sK65YaJ127fg5P3oA09"
).strip()
STRIPE_SPRINT_URL = os.getenv(
    "STRIPE_SPRINT_URL", "https://buy.stripe.com/aFabJ00LEdVd3bj3j33oA07"
).strip()
STRIPE_RETAINER_URL = os.getenv(
    "STRIPE_RETAINER_URL", "https://buy.stripe.com/7sY7sK2TMdVd13b4n73oA08"
).strip()

HOME_SERVICES_TYPES = {
    "soft wash",
    "roofing",
    "hvac",
    "plumbing",
    "pest",
    "landscaping",
}

# API_STATUS + the four Google helpers now live in api_clients/google_apis.py
# (imported above). This file keeps audit orchestration only.

# Hard cap on outbound calls per audit run — guard against accidental loops
# and to keep per-audit cost bounded. The new Places API is single-call so the
# default drops from 6 to 5: 1 PSI + 1 Places + 1 SafeBrowsing + 1 CustomSearch
# + 1 slot of headroom.
AUDIT_API_BUDGET = int(os.getenv("AUDIT_API_BUDGET", "5"))
API_TIMEOUT = float(os.getenv("API_TIMEOUT", "8.0"))

# Daily ceiling on /audit calls — prevents abuse + runaway Google bills.
AUDIT_DAILY_LIMIT = int(os.getenv("AUDIT_DAILY_LIMIT", "100"))


# ── REQUEST / RESPONSE MODELS ───────────────────────────────


class AuditRequest(BaseModel):
    business_name: str
    website: str
    city: str
    business_type: str = "soft wash"
    email: str


class AuditRevenueLeak(BaseModel):
    monthly_leak: int
    annual_leak: int
    missed_calls_per_month: int
    avg_job_value: int
    recovery_potential: int
    recovery_calls: int
    payback_months: int


class Recommendation(BaseModel):
    title: str
    detail: str
    impact: str  # critical | high | medium | low
    effort: str  # low | medium | high
    category: str


class AuditResponse(BaseModel):
    audit_id: str
    business_name: str
    website: str
    city: str
    business_type: str
    email: str
    total_score: int
    grade: str
    grade_label: str
    percentile: int
    segment: str
    lola_message: str
    revenue_leak: AuditRevenueLeak
    page_speed: dict
    safety: dict
    business_info: dict
    competitors: List[dict]
    categories: dict
    signals: dict
    recommendations: List[Recommendation]


class LeadItem(BaseModel):
    id: str
    email: str
    business_name: str
    website: str
    city: str
    business_type: str
    total_score: int
    grade: str
    revenue_leak: int
    segment: str
    created_at: str
    lead_score: Optional[int] = None
    temperature: Optional[str] = None


class LeadsResponse(BaseModel):
    leads: List[LeadItem]


# ── HOME SERVICES JOB VALUES ────────────────────────────────

JOB_VALUES = {
    "soft wash": 500,
    "roofing": 8000,
    "hvac": 650,
    "plumbing": 400,
    "pest": 250,
    "landscaping": 350,
    "default": 500,
}


def normalize_business_type(value: str) -> str:
    v = (value or "").strip().lower()
    return v if v in HOME_SERVICES_TYPES else "default"


def calculate_revenue_leak(business_type: str, score: int) -> dict:
    job_value = JOB_VALUES.get(business_type.lower(), JOB_VALUES["default"])

    def missed_calls_for(s: int) -> int:
        if s >= 90:
            return 3
        if s >= 80:
            return 8
        if s >= 70:
            return 15
        if s >= 60:
            return 25
        if s >= 50:
            return 40
        return 60

    missed_calls = missed_calls_for(score)
    monthly_leak = missed_calls * job_value
    annual_leak = monthly_leak * 12

    improved_score = min(score + 25, 100)
    improved_leak = missed_calls_for(improved_score) * job_value
    recovery_potential = monthly_leak - improved_leak

    return {
        "monthly_leak": int(monthly_leak),
        "annual_leak": int(annual_leak),
        "missed_calls_per_month": missed_calls,
        "avg_job_value": int(job_value),
        "recovery_potential": int(recovery_potential),
        "recovery_calls": int(recovery_potential / job_value) if job_value > 0 else 0,
        "payback_months": (
            max(1, int(7200 / (recovery_potential / 12))) if recovery_potential > 0 else 0
        ),
    }


def get_grade(score: int) -> tuple:
    if score < 0:
        return "?", "Incomplete Audit"
    if score >= 90:
        return "A", "Best in Show"
    if score >= 80:
        return "B", "Solid Foundation"
    if score >= 70:
        return "C", "Needs Work"
    if score >= 60:
        return "D", "Needs Training"
    return "F", "Off the Leash"



# ── PHASE 1 HOME SERVICES SCORING ───────────────────────────
#
# Home services contractors rank on GBP completeness, reviews, mobile speed,
# and local trust. Weights below reflect that priority. Each signal is 0-100;
# missing signals are excluded from the denominator (graceful degradation, not
# a zero penalty for an unavailable API).

CONFIDENCE_TO_SCORE = {"high": 90, "medium": 65, "low": 35}


def compute_agent_readiness_score(
    page_speed: dict, business_info: dict, safe_browsing: dict
) -> dict:
    """
    Phase 1 Agent Readiness Score — how prepared is this business to be
    SURFACED by AI search agents (ChatGPT, Perplexity, Google AI Overviews,
    Gemini) when they answer "best <service> in <city>" queries.

    Computed from existing audit signals — no extra API calls. Returns:
        { "score": int 0-100, "grade": "A".."F", "categories": [...] }

    Per the spec, the five categories sum to 100:
        Entity Clarity        (25 pts)  GMB completeness + verification
        Multi-Source Presence (25 pts)  Citations + NAP consistency
        Review Velocity       (20 pts)  Rating + count
        Content Depth         (15 pts)  Lighthouse SEO + accessibility
        Technical Foundation  (15 pts)  Lighthouse performance + safety
    """
    bi_ok = bool(business_info.get("ok", False))
    confidence = business_info.get("verification_confidence", "low")
    rating = float(business_info.get("rating") or 0)
    review_count = int(business_info.get("review_count") or 0)
    ps_ok = bool(page_speed.get("ok", False))
    sb_ok = bool(safe_browsing.get("ok", False))
    is_safe = bool(safe_browsing.get("is_safe", True))

    # 1. Entity Clarity (25) — GMB completeness signal
    confidence_pts = {"high": 100, "medium": 65, "low": 35}.get(confidence, 35)
    entity_pts = int(25 * (confidence_pts / 100)) if bi_ok else 0

    # 2. Multi-Source Presence (25) — proxied by GBP presence + has-website
    has_website = bool(business_info.get("website"))
    has_phone = bool(business_info.get("phone"))
    has_address = bool(business_info.get("address"))
    nap_score = sum([has_website, has_phone, has_address]) / 3
    multi_pts = int(25 * nap_score) if bi_ok else 0

    # 3. Review Velocity & Recency (20)
    if bi_ok and review_count > 0:
        rating_pts = (rating / 5.0) if rating else 0
        # 50 reviews → full credit
        count_pts = min(1.0, review_count / 50.0)
        review_pts = int(20 * (0.6 * rating_pts + 0.4 * count_pts))
    else:
        review_pts = 0

    # 4. Content Depth (15) — Lighthouse SEO + a11y
    if ps_ok:
        content_pts = int(15 * ((page_speed.get("seo", 50) + page_speed.get("accessibility", 50)) / 200))
    else:
        content_pts = 0

    # 5. Technical Foundation (15) — Lighthouse perf + Safe Browsing clean
    if ps_ok:
        perf_component = page_speed.get("performance", 50) / 100
        safety_component = 1.0 if (not sb_ok or is_safe) else 0.0
        tech_pts = int(15 * (0.7 * perf_component + 0.3 * safety_component))
    else:
        tech_pts = 0

    raw_total = entity_pts + multi_pts + review_pts + content_pts + tech_pts
    score = max(0, min(100, raw_total))

    if score >= 85:
        grade = ("A", "Agent-Ready")
    elif score >= 70:
        grade = ("B", "Mostly Ready")
    elif score >= 55:
        grade = ("C", "Needs Work")
    elif score >= 40:
        grade = ("D", "Largely Invisible")
    else:
        grade = ("F", "Invisible to AI")

    return {
        "score": score,
        "grade": grade[0],
        "grade_label": grade[1],
        "categories": [
            {"name": "Entity Clarity", "score": int(entity_pts / 25 * 100), "weight": 25, "value": entity_pts, "available": bi_ok},
            {"name": "Multi-Source Presence", "score": int(multi_pts / 25 * 100), "weight": 25, "value": multi_pts, "available": bi_ok},
            {"name": "Review Velocity", "score": int(review_pts / 20 * 100) if review_pts else 0, "weight": 20, "value": review_pts, "available": bi_ok and review_count > 0},
            {"name": "Content Depth", "score": int(content_pts / 15 * 100), "weight": 15, "value": content_pts, "available": ps_ok},
            {"name": "Technical Foundation", "score": int(tech_pts / 15 * 100), "weight": 15, "value": tech_pts, "available": ps_ok},
        ],
    }


def compute_home_services_score(
    page_speed: dict, business_info: dict, safe_browsing: dict
) -> tuple:
    """Returns (total_score, category_scores, signal_status)."""
    entries = []

    # GBP completeness — 25%
    confidence = business_info.get("verification_confidence", "low")
    entries.append(
        (
            "gbp_completeness",
            25,
            CONFIDENCE_TO_SCORE.get(confidence, 35),
            bool(business_info.get("ok", False)),
        )
    )

    # Reviews + rating — 20%
    rating = float(business_info.get("rating") or 0)
    review_count = int(business_info.get("review_count") or 0)
    if business_info.get("ok") and review_count > 0:
        rating_pts = (rating / 5.0) * 100 if rating else 0
        count_pts = min(100, (review_count / 50.0) * 100)
        review_score = int(0.6 * rating_pts + 0.4 * count_pts)
    else:
        review_score = 0
    entries.append(
        (
            "reviews",
            20,
            review_score,
            bool(business_info.get("ok", False)) and review_count > 0,
        )
    )

    # Mobile speed — 20%
    entries.append(
        ("mobile_speed", 20, page_speed.get("performance", 50), bool(page_speed.get("ok", False)))
    )

    # SEO basics (Lighthouse SEO) — 10%
    entries.append(
        ("seo_basics", 10, page_speed.get("seo", 50), bool(page_speed.get("ok", False)))
    )

    # Accessibility — 10%
    entries.append(
        (
            "accessibility",
            10,
            page_speed.get("accessibility", 50),
            bool(page_speed.get("ok", False)),
        )
    )

    # Local trust (address + phone present) — 10%
    local_pts = 0
    if business_info.get("address"):
        local_pts += 50
    if business_info.get("phone"):
        local_pts += 50
    entries.append(("local_trust", 10, local_pts, bool(business_info.get("ok", False))))

    # Safe browsing — 5%. Only counted when the API actually responded;
    # otherwise we have no idea whether the site is safe, so we say so
    # instead of optimistically pretending it's clean.
    sb_ok = bool(safe_browsing.get("ok", False))
    entries.append(
        ("safety", 5, 100 if safe_browsing.get("is_safe", True) else 0, sb_ok)
    )

    available_weight = sum(w for _, w, _, ok in entries if ok)
    total_weight = sum(w for _, w, _, _ in entries)

    # If fewer than 30% of total weight is available, we don't have enough
    # signal to grade fairly. Return an explicit "incomplete" sentinel and let
    # the endpoint surface that to the UI.
    if available_weight < total_weight * 0.30:
        return -1, {name: {"score": int(v)} for name, _, v, _ in entries}, {
            name: {"weight": w, "value": int(v), "available": bool(ok)}
            for name, w, v, ok in entries
        }

    weighted = sum(w * v for _, w, v, ok in entries if ok)
    total_score = int(round(weighted / available_weight))
    total_score = max(0, min(100, total_score))

    category_scores = {name: {"score": int(v)} for name, _, v, _ in entries}
    signal_status = {
        name: {"weight": w, "value": int(v), "available": bool(ok)}
        for name, w, v, ok in entries
    }
    return total_score, category_scores, signal_status


# ── RECOMMENDATIONS ───────────────────────────────────────
#
# Signal-driven, ranked, capped at 5. Customers don't need 12 things to do —
# they need the next 3-5. Sort by impact desc, then effort asc, so the highest
# value / lowest effort move is always first.

_IMPACT_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}
_EFFORT_RANK = {"low": 0, "medium": 1, "high": 2}


def generate_recommendations(
    business_info: dict, page_speed: dict, safety: dict
) -> List[dict]:
    recs: List[dict] = []

    # Safety first — a flagged site beats every other priority.
    if not safety.get("is_safe", True):
        recs.append({
            "title": "Critical: site flagged by Safe Browsing",
            "detail": "Google may show visitors a security warning. Resolve the flagged content before anything else.",
            "impact": "critical",
            "effort": "high",
            "category": "safety",
        })

    bi_ok = bool(business_info.get("ok"))
    rating = float(business_info.get("rating") or 0)
    review_count = int(business_info.get("review_count") or 0)
    confidence = business_info.get("verification_confidence", "low")

    if bi_ok and review_count == 0:
        recs.append({
            "title": "Get your first 10 Google reviews",
            "detail": "Zero reviews kills click-through. Text the last 20 completed jobs a short ask + your GBP link. Aim for 10 in two weeks.",
            "impact": "critical",
            "effort": "low",
            "category": "reviews",
        })
    elif bi_ok and review_count < 20:
        recs.append({
            "title": f"Push past 20 reviews (you have {review_count})",
            "detail": "20+ is the credibility cliff most homeowners scan for. Ask after every paid job — text + email + a card with a QR.",
            "impact": "high",
            "effort": "low",
            "category": "reviews",
        })

    if rating > 0 and rating < 4.3:
        recs.append({
            "title": f"Lift your average rating from {rating:.1f}★",
            "detail": "Reply to every existing review (especially 1-3 stars — be calm and specific). Then ask happy customers directly. New 5s bury old 1s faster than you'd think.",
            "impact": "high",
            "effort": "low",
            "category": "reviews",
        })

    if bi_ok and confidence in ("low", "medium"):
        missing = []
        if not business_info.get("website"):
            missing.append("website link")
        if not business_info.get("phone"):
            missing.append("phone number")
        if not business_info.get("address"):
            missing.append("address")
        detail = (
            "Add: " + ", ".join(missing) + "."
            if missing
            else "Fill every field — photos, hours, services list, description, and attributes. Incomplete profiles get outranked by complete ones in the same zip code."
        )
        recs.append({
            "title": "Complete your Google Business Profile",
            "detail": detail,
            "impact": "high",
            "effort": "low",
            "category": "gbp",
        })

    ps_ok = bool(page_speed.get("ok"))
    perf = page_speed.get("performance", 100)
    seo = page_speed.get("seo", 100)
    a11y = page_speed.get("accessibility", 100)

    if ps_ok and perf < 50:
        recs.append({
            "title": f"Mobile speed is hurting you ({perf}/100)",
            "detail": "Compress every hero image to WebP under 200KB. Lazy-load below the fold. Turn off any analytics/chat scripts that block first paint. This is the #1 lever for tap-to-call rates.",
            "impact": "high",
            "effort": "medium",
            "category": "mobile_speed",
        })
    elif ps_ok and perf < 75:
        recs.append({
            "title": f"Tune up mobile speed ({perf}/100 → aim for 80+)",
            "detail": "Audit your largest two images and your slowest third-party script. Two changes usually move this 15+ points.",
            "impact": "medium",
            "effort": "low",
            "category": "mobile_speed",
        })

    if ps_ok and seo < 80:
        recs.append({
            "title": "Tighten on-page SEO basics",
            "detail": "Unique title tag and meta description per service page. Put city + service in the H1. Fix any 4xx links you have.",
            "impact": "medium",
            "effort": "low",
            "category": "seo_basics",
        })

    if ps_ok and a11y < 80:
        recs.append({
            "title": "Fix accessibility hits",
            "detail": "Add alt text to images, fix color contrast, label form inputs. Google quietly rewards accessible sites and the work doubles as conversion polish.",
            "impact": "low",
            "effort": "low",
            "category": "accessibility",
        })

    # Always-on contractor playbook moves, but only added if we have headroom.
    # We never want to push generic advice over data-driven advice.
    headroom = 5 - len(recs)
    fallback_picks = [
        {
            "title": "Post one photo to your GBP every week",
            "detail": "Before/after, crew on site, equipment shots. Google ranks fresh profiles higher and photos lift click-through by ~30%.",
            "impact": "medium",
            "effort": "low",
            "category": "general",
        },
        {
            "title": "One service-area page per city you cover",
            "detail": "Examples: /soft-wash-tampa, /soft-wash-clearwater. Each gets its own GBP-aligned title and 200-400 words specific to that area.",
            "impact": "medium",
            "effort": "medium",
            "category": "general",
        },
        {
            "title": "Click-to-call button above the fold on mobile",
            "detail": "Big, gold, sticky. If a homeowner has to scroll to find your number, the lead is already cold.",
            "impact": "medium",
            "effort": "low",
            "category": "general",
        },
    ]
    for f in fallback_picks[:headroom]:
        recs.append(f)

    recs.sort(
        key=lambda r: (
            _IMPACT_RANK.get(r["impact"], 9),
            _EFFORT_RANK.get(r["effort"], 9),
        )
    )
    return recs[:5]


# ── BREVO + RESEND ─────────────────────────────────────────


async def send_to_brevo(
    client: httpx.AsyncClient,
    email: str,
    business_name: str,
    city: str,
    business_type: str,
    total_score: int,
    revenue_leak: dict,
    grade: str,
    grade_label: str,
    temperature: str,
) -> bool:
    if not BREVO_API_KEY:
        return False
    try:
        payload = {
            "email": email,
            "attributes": {
                "BUSINESS_NAME": business_name,
                "CITY": city,
                "BUSINESS_TYPE": business_type,
                "SEO_SCORE": total_score,
                "SEO_GRADE": grade,
                "SEO_GRADE_LABEL": grade_label,
                "MONTHLY_LEAK": revenue_leak.get("monthly_leak", 0),
                "ANNUAL_LEAK": revenue_leak.get("annual_leak", 0),
                "MISSED_CALLS": revenue_leak.get("missed_calls_per_month", 0),
                "RECOVERY_POTENTIAL": revenue_leak.get("recovery_potential", 0),
                "PAYBACK_MONTHS": revenue_leak.get("payback_months", 0),
                "LOLA_TEMPERATURE": temperature,
                "AUDIT_SOURCE": "lola_seo",
                "AUDIT_DATE": datetime.now().isoformat(),
            },
            "listIds": [int(BREVO_LIST_ID)],
            "updateEnabled": True,
        }
        resp = await client.post(
            "https://api.brevo.com/v3/contacts",
            json=payload,
            headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
            timeout=API_TIMEOUT,
        )
        return resp.status_code in (200, 201)
    except Exception as e:
        print(f"Brevo error: {e}")
        return False


def _derive_first_name(business_name: str, email: str) -> str:
    """
    Best-effort first name for greeting. Falls back gracefully:
      1) email local-part if it looks like a first name (single word ≤16 chars, alpha)
      2) first word of business_name if non-generic
      3) "there"
    """
    if email and "@" in email:
        local = email.split("@", 1)[0].split("+", 1)[0]
        # Strip common separators, take first chunk
        first_chunk = local.replace(".", " ").replace("_", " ").replace("-", " ").split()[0] if local else ""
        if first_chunk and first_chunk.isalpha() and len(first_chunk) <= 16:
            return first_chunk.capitalize()
    if business_name:
        return business_name.split()[0]
    return "there"


# A/B test subject — round-robined by audit_id hash so users hitting the same
# audit twice see the same subject (no inconsistency on resend).
def _pick_subject(business_name: str, monthly_leak: int, audit_id: str) -> str:
    leak_fmt = f"${monthly_leak:,}"
    variants = [
        f"{business_name} — your audit's in (and there's {leak_fmt}/mo on the table)",
        f"[{business_name}] Lola sniffed out {leak_fmt}/mo leaking from your site",
    ]
    return variants[hash(audit_id) % 2]


async def send_audit_email(
    client: httpx.AsyncClient,
    to_email: str,
    business_name: str,
    total_score: int,
    grade: str,
    grade_label: str,
    monthly_leak: int,
    lola_message: str,
    audit_id: str,
) -> bool:
    if not RESEND_API_KEY:
        print("Resend skipped: RESEND_API_KEY not configured.")
        return False

    first_name = _derive_first_name(business_name, to_email)
    tier_label = f"{grade_label} ({grade} tier)"
    monthly_fmt = f"${monthly_leak:,}"
    yearly_fmt = f"${monthly_leak * 12:,}"
    report_url = f"{PUBLIC_APP_URL}/r/{audit_id}"
    subject = _pick_subject(business_name, monthly_leak, audit_id)

    # Plain-text fallback (Gmail uses this for the preview pane + accessibility)
    text = f"""Hey {first_name},

Lola finished sniffing around {business_name}'s local SEO — and she's got news.

THE SCORE
{total_score}/100 — {tier_label}

You're already ahead of most contractors in Florida. That's the good news.

THE LEAK
{monthly_fmt}/month walking out the door

That's not theoretical. That's the estimated revenue slipping to competitors every 30 days because of fixable gaps Lola found in your local SEO + AI search visibility.

{yearly_fmt}/year. Every year. Until it's fixed.

VIEW YOUR FULL AUDIT REPORT:
{report_url}

Inside the report:
- Your priority fix list (ranked by revenue impact)
- AI Search Visibility score (ChatGPT + Google AI)
- GMB optimization gaps
- Citation cleanup opportunities
- The exact moves to lock in your lead

WHAT NOW? 3 PATHS, YOUR CHOICE:

OPTION 1 — Do It Yourself ($47)
The DIY Playbook. Every checklist Lola uses, in plain English.
{STRIPE_DIY_URL}

OPTION 2 — Get a Real Plan ($397)
The Local SEO Sprint. Lola + Coach Ty build your custom 90-day action plan in a 60-min strategy call. First Win Promise backed.
{STRIPE_SPRINT_URL}

OPTION 3 — Hand It Off ($697/mo)
The Lola Retainer. Six specialist AI agents + Coach Ty working your account weekly. Cancel anytime.
{STRIPE_RETAINER_URL}

Or just hit reply. Tell me what you want fixed first, and I'll walk you through the order. No pitch, no pressure.

Talk soon,
Coach Ty
Founder, Lola | Ty Alexander Media | Tampa

P.S. — That {total_score} score means you're already doing the hard part. The next gap is where the {monthly_fmt}/mo lives. Don't leave it on the table.
"""

    # Mobile-responsive HTML — single column, 600px max, inline styles (email-safe).
    # Tap targets are 48px tall minimum. Stripe links open in new tab (target=_blank).
    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{subject}</title></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E8E4D8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A0A0A;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#111111;border:1px solid #222222;border-radius:12px;overflow:hidden;">

<tr><td style="padding:32px 28px 8px;">
<p style="margin:0 0 18px;font-size:17px;line-height:1.55;color:#E8E4D8;">Hey {first_name},</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#C8C0B0;">Lola finished sniffing around <strong style="color:#F0EAD6;">{business_name}</strong>'s local SEO — and she's got news.</p>
</td></tr>

<tr><td style="padding:0 28px;"><hr style="border:0;border-top:1px solid #1F1F1F;margin:0;"></td></tr>

<tr><td style="padding:24px 28px;">
<p style="margin:0 0 6px;font-family:'DM Mono',monospace,Courier;font-size:10px;letter-spacing:0.16em;color:#A89F94;text-transform:uppercase;font-weight:600;">THE SCORE</p>
<p style="margin:0 0 8px;"><span style="font-size:38px;font-weight:700;color:#C9A84C;">{total_score}</span><span style="font-size:18px;color:#A89F94;">/100</span></p>
<p style="margin:0 0 18px;font-size:14px;color:#E8E4D8;font-weight:600;">{tier_label}</p>
<p style="margin:0;font-size:15px;line-height:1.65;color:#C8C0B0;">You're already ahead of most contractors in Florida. That's the good news.</p>
</td></tr>

<tr><td style="padding:0 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A0A0A;border:1px solid #E05252;border-radius:8px;">
<tr><td style="padding:22px 24px;">
<p style="margin:0 0 6px;font-family:'DM Mono',monospace,Courier;font-size:10px;letter-spacing:0.16em;color:#E05252;text-transform:uppercase;font-weight:600;">THE LEAK</p>
<p style="margin:0 0 12px;"><span style="font-size:32px;font-weight:700;color:#F0EAD6;">{monthly_fmt}</span><span style="font-size:14px;color:#A89F94;">/month walking out the door</span></p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#C8C0B0;">That's not theoretical. That's the estimated revenue slipping to competitors every 30 days because of fixable gaps Lola found in your local SEO + AI search visibility.</p>
<p style="margin:0;font-size:15px;line-height:1.65;color:#F0EAD6;font-weight:600;">{yearly_fmt}/year. Every year. Until it's fixed.</p>
</td></tr></table>
</td></tr>

<tr><td style="padding:28px 28px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
<tr><td style="border-radius:8px;background:#C9A84C;">
<a href="{report_url}" target="_blank" rel="noopener" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#0A0A0A;text-decoration:none;min-height:48px;line-height:1.2;">📊 View Your Full Audit Report →</a>
</td></tr></table>
<p style="margin:14px 0 0;text-align:center;font-size:12px;color:#7A7268;word-break:break-all;">{report_url}</p>
</td></tr>

<tr><td style="padding:8px 28px 24px;">
<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#C8C0B0;">Inside the report:</p>
<ul style="margin:0 0 0 20px;padding:0;font-size:14px;line-height:1.7;color:#C8C0B0;">
<li>Your priority fix list (ranked by revenue impact)</li>
<li>AI Search Visibility score (ChatGPT + Google AI)</li>
<li>GMB optimization gaps</li>
<li>Citation cleanup opportunities</li>
<li>The exact moves to lock in your lead</li>
</ul>
</td></tr>

<tr><td style="padding:0 28px;"><hr style="border:0;border-top:1px solid #1F1F1F;margin:0;"></td></tr>

<tr><td style="padding:28px 28px 8px;">
<p style="margin:0 0 18px;font-family:'DM Mono',monospace,Courier;font-size:11px;letter-spacing:0.16em;color:#A89F94;text-transform:uppercase;font-weight:600;">WHAT NOW? 3 PATHS, YOUR CHOICE:</p>
</td></tr>

<tr><td style="padding:0 28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A0A0A;border:1px solid #222222;border-radius:8px;">
<tr><td style="padding:20px 22px;">
<p style="margin:0 0 6px;font-size:15px;color:#F0EAD6;"><span style="font-size:18px;">🦴</span> <strong>OPTION 1 — Do It Yourself</strong> <span style="color:#C9A84C;">($47)</span></p>
<p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:#C8C0B0;">The DIY Playbook. Every checklist Lola uses, in plain English. For contractors with time, not budget.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:6px;background:#222222;border:1px solid #C9A84C;">
<a href="{STRIPE_DIY_URL}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 22px;font-size:13px;font-weight:700;color:#C9A84C;text-decoration:none;min-height:44px;line-height:1.4;">Get the Playbook — $47 →</a>
</td></tr></table>
</td></tr></table>
</td></tr>

<tr><td style="padding:0 28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A0A0A;border:1px solid #222222;border-radius:8px;">
<tr><td style="padding:20px 22px;">
<p style="margin:0 0 6px;font-size:15px;color:#F0EAD6;"><span style="font-size:18px;">🦴</span> <strong>OPTION 2 — Get a Real Plan</strong> <span style="color:#C9A84C;">($397)</span></p>
<p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:#C8C0B0;">The Local SEO Sprint. Lola + Coach Ty build your custom 90-day action plan in a 60-min strategy call. You execute, we guide. First Win Promise backed.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:6px;background:#222222;border:1px solid #C9A84C;">
<a href="{STRIPE_SPRINT_URL}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 22px;font-size:13px;font-weight:700;color:#C9A84C;text-decoration:none;min-height:44px;line-height:1.4;">Start the Sprint — $397 →</a>
</td></tr></table>
</td></tr></table>
</td></tr>

<tr><td style="padding:0 28px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1A1408;border:1.5px solid #C9A84C;border-radius:8px;">
<tr><td style="padding:20px 22px;">
<p style="margin:0 0 6px;font-size:15px;color:#F0EAD6;"><span style="font-size:18px;">🦴</span> <strong>OPTION 3 — Hand It Off</strong> <span style="color:#C9A84C;">($697/mo)</span></p>
<p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:#C8C0B0;">The Lola Retainer. Six specialist AI agents + Coach Ty working your account weekly. We fix what's broken — you focus on running the business. Cancel anytime.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:6px;background:#C9A84C;">
<a href="{STRIPE_RETAINER_URL}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#0A0A0A;text-decoration:none;min-height:48px;line-height:1.4;">Start the Retainer — $697/mo →</a>
</td></tr></table>
</td></tr></table>
</td></tr>

<tr><td style="padding:0 28px;"><hr style="border:0;border-top:1px solid #1F1F1F;margin:0;"></td></tr>

<tr><td style="padding:24px 28px;">
<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#F0EAD6;font-weight:600;">OR JUST HIT REPLY.</p>
<p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#C8C0B0;">Tell me what you want fixed first, and I'll walk you through the order. No pitch, no pressure — just a real conversation about what's costing you the most.</p>
<p style="margin:0 0 4px;font-size:14px;color:#C8C0B0;">Talk soon,</p>
<p style="margin:0;font-size:15px;color:#F0EAD6;font-weight:600;">Coach Ty</p>
<p style="margin:4px 0 0;font-size:12px;color:#A89F94;">Founder, Lola | Ty Alexander Media | Tampa<br>📱 Reply or text anytime</p>
</td></tr>

<tr><td style="padding:0 28px 28px;">
<p style="margin:0;padding:14px 18px;background:#0A0A0A;border-left:3px solid #C9A84C;border-radius:0 6px 6px 0;font-size:13px;line-height:1.6;color:#C8C0B0;font-style:italic;">P.S. — That <strong style="color:#F0EAD6;">{total_score}</strong> score means you're already doing the hard part. The next gap is where the <strong style="color:#F0EAD6;">{monthly_fmt}/mo</strong> lives. Don't leave it on the table.</p>
</td></tr>

</table>
</td></tr></table>
</body></html>"""

    try:
        resp = await client.post(
            "https://api.resend.com/emails",
            json={
                "from": AUDIT_FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "html": html,
                "text": text,
                "reply_to": AUDIT_REPLY_TO_EMAIL,
            },
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            timeout=API_TIMEOUT,
        )
        if not (200 <= resp.status_code < 300):
            print(f"Resend error {resp.status_code} for audit {audit_id}: {resp.text[:200]}")
            return False
        return True
    except Exception:
        traceback.print_exc()
        return False


# ── LOLA VOICE ─────────────────────────────────────────────
# Single source of truth lives in lola_voice.md. We keep a tiny in-memory
# subset here so the API always has a Day-0 message ready without re-parsing
# the markdown on every request.

def lola_message_for(segment: str, business_name: str) -> str:
    bn = business_name or "your business"
    if segment == "incomplete":
        return (
            f"Lola couldn't get enough signal to grade {bn} fairly — Google's APIs "
            "are quiet on this run. The playbook below is the safe-bet starting point."
        )
    if segment == "urgent":
        return (
            f"Heads up, {bn}: the leaks are real and they're loud. "
            "Three fixes get you back in the game."
        )
    if segment == "education":
        return (
            f"{bn} has solid bones. A handful of targeted moves turn this into "
            "a lead machine."
        )
    return (
        f"{bn} is already in the top tier. Now we tighten the bolts and stretch "
        "the lead."
    )


# ── MAIN ENDPOINT ──────────────────────────────────────────


@app.post("/audit", response_model=AuditResponse)
async def audit(request: AuditRequest) -> AuditResponse:
    website = (
        request.website if request.website.startswith("http") else f"https://{request.website}"
    )
    business_type = normalize_business_type(request.business_type)

    print(f"🐾 AUDIT: {request.business_name} ({request.city}) — {business_type}")

    budget = ApiBudget(AUDIT_API_BUDGET)

    try:
        async with httpx.AsyncClient() as client:
            (
                page_speed_result,
                safe_browsing_result,
                business_info_result,
                competitors,
            ) = await asyncio.gather(
                get_page_speed(client, website, budget),
                get_safe_browsing(client, website, budget),
                get_business_info(client, request.business_name, request.city, budget),
                get_competitors(client, business_type, request.city, budget),
            )

            total_score, category_scores, signal_status = compute_home_services_score(
                page_speed_result, business_info_result, safe_browsing_result,
            )
            agent_readiness = compute_agent_readiness_score(
                page_speed_result, business_info_result, safe_browsing_result,
            )
            incomplete = total_score < 0

            # For percentile + revenue-leak math we need a numeric score even
            # when the audit is incomplete. Use a conservative midpoint (50)
            # so we don't paint a falsely rosy or doomy picture.
            scoring_score = 50 if incomplete else total_score

            percentile = await get_percentile(business_type, request.city, scoring_score)
            revenue_leak = calculate_revenue_leak(business_type, scoring_score)
            grade, grade_label = get_grade(total_score)
            audit_id = str(uuid.uuid4())
            if incomplete:
                segment = "incomplete"
            elif total_score < 60:
                segment = "urgent"
            elif total_score < 80:
                segment = "education"
            else:
                segment = "optimization"
            lola_message = lola_message_for(segment, request.business_name)

            lead_score, temperature = classify_temperature(
                seo_score=scoring_score,
                monthly_leak=revenue_leak["monthly_leak"],
                verification_confidence=business_info_result.get(
                    "verification_confidence", "low"
                ),
                has_website=bool(business_info_result.get("website")),
            )

            business_info_result["verification_confidence_description"] = (
                "Profile completeness signal — based on website, hours, photos, "
                "reviews, address, and phone. Not direct owner-verification by Google."
            )

            recommendations = generate_recommendations(
                business_info_result, page_speed_result, safe_browsing_result
            )

            audit_response = {
                "audit_id": audit_id,
                "business_name": request.business_name,
                "website": website,
                "city": request.city,
                "business_type": business_type,
                "email": request.email,
                "total_score": total_score,
                "grade": grade,
                "grade_label": grade_label,
                "revenue_leak": revenue_leak,
                "page_speed": {
                    "performance": page_speed_result.get("performance", 50),
                    "accessibility": page_speed_result.get("accessibility", 50),
                    "seo": page_speed_result.get("seo", 50),
                    "ok": page_speed_result.get("ok", False),
                },
                "safety": {
                    "is_safe": safe_browsing_result.get("is_safe", True),
                    "ok": safe_browsing_result.get("ok", False),
                },
                "business_info": business_info_result,
                "competitors": competitors,
                "percentile": percentile,
                "segment": segment,
                "lola_message": lola_message,
                "categories": category_scores,
                "signals": signal_status,
                "recommendations": recommendations,
                "agent_readiness": agent_readiness,
            }

            await save_audit(
                audit_id,
                {
                    "email": request.email,
                    "business_name": request.business_name,
                    "website": website,
                    "city": request.city,
                    "business_type": business_type,
                    "total_score": total_score,
                    "grade": grade,
                    "revenue_leak_monthly": revenue_leak.get("monthly_leak", 0),
                    "biggest_bottleneck": {"title": ""},
                    "segment": segment,
                    "confidence_score": percentile,
                    "raw_result": audit_response,
                },
            )

            await upsert_lead(
                audit_id=audit_id,
                email=request.email,
                business_name=request.business_name,
                lead_score=lead_score,
                temperature=temperature,
                segment=segment,
                seo_score=total_score,
                monthly_leak=revenue_leak["monthly_leak"],
            )

            # If this email was in a cold-outreach batch, mark it converted +
            # auto-suppress so Agent 4 never re-targets a customer who audited.
            await mark_audit_submitted(request.email)

            # Fire-and-forget side effects so the user doesn't wait on Brevo/Resend.
            # Phase 1 is low-volume; if the process restarts mid-send, the next
            # audit will sync this lead again.
            asyncio.create_task(
                _followups(
                    email=request.email,
                    business_name=request.business_name,
                    city=request.city,
                    business_type=business_type,
                    total_score=total_score,
                    grade=grade,
                    grade_label=grade_label,
                    revenue_leak=revenue_leak,
                    lola_message=lola_message,
                    temperature=temperature,
                    audit_id=audit_id,
                )
            )

            print(f"📞 API calls used: {budget.used}/{budget.cap}")
            return audit_response

    except Exception as e:
        print(f"❌ ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


async def _followups(
    email: str,
    business_name: str,
    city: str,
    business_type: str,
    total_score: int,
    grade: str,
    grade_label: str,
    revenue_leak: dict,
    lola_message: str,
    temperature: str,
    audit_id: str,
):
    try:
        async with httpx.AsyncClient() as client:
            await asyncio.gather(
                send_to_brevo(
                    client,
                    email,
                    business_name,
                    city,
                    business_type,
                    total_score,
                    revenue_leak,
                    grade,
                    grade_label,
                    temperature,
                ),
                send_audit_email(
                    client,
                    email,
                    business_name,
                    total_score,
                    grade,
                    grade_label,
                    revenue_leak.get("monthly_leak", 0),
                    lola_message,
                    audit_id,
                ),
            )
    except Exception as e:
        print(f"Followup error: {e}")


@app.get("/audits/{audit_id}")
async def get_audit(audit_id: str):
    """Public read-only fetch of a stored audit by id. Used by shareable /r/:id links."""
    payload = await get_audit_by_id(audit_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Audit not found")
    # The stored payload is the same shape the original /audit endpoint returned.
    return payload


@app.get("/health")
async def health():
    """
    Health endpoint surfaces both key presence AND last-known live status per
    Google API. The live status is populated by real audit traffic, not by
    extra probe calls, so this view is free quota-wise.
    """
    return {
        "status": "ok",
        "has_keys": {
            "google_pagespeed": bool(GOOGLE_PAGESPEED_KEY),
            "google_places": bool(GOOGLE_PLACES_KEY),
            "google_safe_browsing": bool(GOOGLE_SAFE_BROWSING_KEY),
            "google_custom_search": bool(
                GOOGLE_CUSTOM_SEARCH_KEY and GOOGLE_CUSTOM_SEARCH_CX
            ),
            "brevo": bool(BREVO_API_KEY),
            "resend": bool(RESEND_API_KEY),
        },
        "api_status": API_STATUS,
        "audit_api_budget": AUDIT_API_BUDGET,
    }


@app.get("/leads", response_model=LeadsResponse)
async def leads(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
    limit: int = 50,
    temperature: Optional[str] = None,
) -> LeadsResponse:
    if x_admin_key != os.getenv("LOLA_SECRET_ADMIN_KEY", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")
    if temperature in ("hot", "warm"):
        return {"leads": await get_warm_leads(limit, only_hot=(temperature == "hot"))}
    return {"leads": await get_recent_leads(limit)}


@app.get("/pricing")
async def pricing():
    """
    Live pricing for the report page. Frontend uses `founding_active` to
    drive the Standard tier label/strikethrough; counter is real and stored
    in `founding_signups` (see db/pricing.py).
    """
    count = await get_founding_count("standard")
    standard_price, founding_active = standard_price_for_count(count)
    slots_remaining = max(0, FOUNDING_CAP - count)
    return {
        "founding_active": founding_active,
        "founding_slots_remaining": slots_remaining,
        "founding_cap": FOUNDING_CAP,
        "tiers": {
            "diy":      {"one_time": 197},
            "standard": {
                "monthly": standard_price,
                "monthly_original": 697,
            },
            "pro":      {"monthly": 997, "monthly_original": 1297},
        },
    }


class FoundingSignupRequest(BaseModel):
    email: str
    tier: str = "standard"


@app.post("/admin/founding-signup")
async def admin_record_founding(
    body: FoundingSignupRequest,
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
):
    """Manual hook: bump the founding-member counter when you onboard a client."""
    if x_admin_key != os.getenv("LOLA_SECRET_ADMIN_KEY", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")
    new_count = await record_founding_signup(body.email, body.tier)
    _, founding_active = standard_price_for_count(new_count)
    return {
        "ok": True,
        "tier": body.tier,
        "count": new_count,
        "founding_active": founding_active,
        "slots_remaining": max(0, FOUNDING_CAP - new_count),
    }


@app.get("/unsubscribe")
async def unsubscribe(email: str, token: str):
    """One-click unsubscribe from cold-outreach emails (CAN-SPAM)."""
    expected = make_unsub_token(email)
    if not expected or token != expected:
        raise HTTPException(status_code=403, detail="Invalid unsubscribe token.")
    await suppress_email(email, reason="unsubscribed")
    return {"ok": True, "email": email, "message": "Unsubscribed. No more emails."}


# ── Tier 2: Resend event webhook (opens/clicks/bounces/complaints) ────


def _verify_svix(secret: str, msg_id: str, timestamp: str, body: bytes, header_sig: str) -> bool:
    """Resend uses Svix signing. Header format: 'v1,<base64-sig> [v1,<...>]'."""
    import base64

    if not secret.startswith("whsec_"):
        return False
    try:
        secret_bytes = base64.b64decode(secret[len("whsec_") :])
    except Exception:
        return False
    expected = base64.b64encode(
        hmac.new(
            secret_bytes, f"{msg_id}.{timestamp}.".encode() + body, hashlib.sha256
        ).digest()
    ).decode()
    for token in header_sig.split(" "):
        if "," in token:
            _, sig = token.split(",", 1)
            if hmac.compare_digest(sig, expected):
                return True
    return False


@app.post("/webhooks/resend")
async def resend_webhook(request: Request):
    """
    Resend event webhook. Updates open/click/bounce/complaint timestamps on
    the matching cold_outreach_log row. Idempotent (re-deliveries are no-ops).
    """
    body_bytes = await request.body()
    secret = os.getenv("RESEND_WEBHOOK_SECRET", "").strip()

    # Only enforce signature verification if a secret is configured. Lets you
    # test locally without one, but production should always set it.
    if secret:
        msg_id = request.headers.get("svix-id", "")
        ts = request.headers.get("svix-timestamp", "")
        sig = request.headers.get("svix-signature", "")
        if not _verify_svix(secret, msg_id, ts, body_bytes, sig):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(body_bytes)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = payload.get("type", "")
    data = payload.get("data", {}) or {}
    resend_message_id = data.get("email_id") or data.get("id")
    if not resend_message_id:
        return {"ok": False, "reason": "missing_message_id"}

    updated = await mark_event(resend_message_id, event_type)
    return {"ok": True, "event": event_type, "updated": updated}


# ── Tier 4: Reply webhook (auto-suppress on reply) ────────────────────


@app.post("/webhooks/reply")
async def reply_webhook(request: Request):
    """
    Inbound-reply webhook. Configure your email provider (Cloudflare Email
    Routing / Mailgun / etc.) to POST inbound replies here.

    Accepts either:
      {"to": "reply+<token>@<domain>", "from": "..."}        — Tier 4 alias match
      {"email": "person@example.com"}                        — plain email match
    Auth: shared secret in `X-Reply-Webhook-Secret` header.
    """
    expected_secret = os.getenv("REPLY_WEBHOOK_SECRET", "").strip()
    if expected_secret:
        provided = request.headers.get("X-Reply-Webhook-Secret", "")
        if not hmac.compare_digest(provided, expected_secret):
            raise HTTPException(status_code=401, detail="Invalid webhook secret")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    to_field = (payload.get("to") or "").lower()
    from_field = (payload.get("from") or payload.get("email") or "").lower()

    reply_alias = None
    if "reply+" in to_field:
        # extract just the addr-spec
        reply_alias = to_field.split("<")[-1].rstrip(">").strip()

    matched = await mark_replied(email=from_field or None, reply_alias=reply_alias)
    return {"ok": True, "matched": matched, "from": from_field, "alias": reply_alias}


@app.get("/outreach/stats")
async def outreach_stats_endpoint(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
    days: int = 7,
    verbose: bool = False,
):
    if x_admin_key != os.getenv("LOLA_SECRET_ADMIN_KEY", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")
    payload = await outreach_stats(days=days)
    if verbose:
        payload["recent"] = await outreach_recent_sends(limit=25)
    return payload


@app.get("/")
async def root():
    return {"name": "Lola SEO", "version": "4.0", "status": "running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
