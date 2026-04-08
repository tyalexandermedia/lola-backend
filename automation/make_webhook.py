import httpx
import asyncio
import logging
from typing import Optional

logger = logging.getLogger("lola.automation")


async def trigger_make_webhook(webhook_url: Optional[str], audit_result: dict, email: str):
    """Fire-and-forget POST to Make.com webhook. Never blocks the audit response."""
    if not webhook_url:
        return

    competitors = audit_result.get("competitors", {}).get("competitors", [])
    def comp(idx: int, field: str) -> str:
        try:
            return competitors[idx].get(field, "N/A")
        except (IndexError, AttributeError):
            return "N/A"

    roadmap = audit_result.get("roadmap", {})
    def roadmap_str(phase: str) -> str:
        items = roadmap.get(phase, [])
        return " | ".join(items[:3]) if items else ""

    payload = {
        "email": email,
        "business_name": audit_result.get("business_name", ""),
        "website": audit_result.get("website", ""),
        "city": audit_result.get("city", ""),
        "business_type": audit_result.get("business_type", ""),
        "total_score": audit_result.get("total_score", 0),
        "grade": audit_result.get("grade", ""),
        "grade_label": audit_result.get("grade_label", ""),
        "revenue_leak": audit_result.get("revenue_leak_monthly", 0),
        "revenue_context": audit_result.get("revenue_context", ""),
        "biggest_bottleneck": (audit_result.get("biggest_bottleneck") or {}).get("title", ""),
        "biggest_bottleneck_description": (audit_result.get("biggest_bottleneck") or {}).get("plain_english", ""),
        "issue_count": len(audit_result.get("issues", [])),
        "segment": audit_result.get("segment", "education"),
        "confidence_score": audit_result.get("confidence_score", 0),
        "percentile_rank": audit_result.get("percentile_rank", 0),
        "percentile_string": audit_result.get("percentile_string", ""),
        "audit_id": audit_result.get("audit_id", ""),
        "report_url": f"https://lola-seo.vercel.app",
        # Competitors for email 3
        "competitor_1_name": comp(0, "title"),
        "competitor_1_url":  comp(0, "url"),
        "competitor_2_name": comp(1, "title"),
        "competitor_2_url":  comp(1, "url"),
        "competitor_3_name": comp(2, "title"),
        "competitor_3_url":  comp(2, "url"),
        # Roadmap for email 4
        "roadmap_30_day": roadmap_str("day_30"),
        "roadmap_60_day": roadmap_str("day_60"),
        "roadmap_90_day": roadmap_str("day_90"),
        # Score colors for email templates
        "score_color": _score_color(audit_result.get("total_score", 0)),
        "grade_bg": _grade_bg(audit_result.get("grade", "F")),
        "grade_color": _grade_color(audit_result.get("grade", "F")),
        # Calendly link
        "calendly_url": "https://www.tyalexandermedia.com/contact",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook_url, json=payload)
            if resp.is_success:
                logger.info(f"Make.com webhook fired — audit {payload['audit_id']}")
            else:
                logger.warning(f"Make.com webhook returned {resp.status_code}")
    except Exception as e:
        logger.error(f"Make.com webhook failed: {e}")


def _score_color(score: int) -> str:
    if score >= 70: return "#22c55e"
    if score >= 45: return "#fbbf24"
    return "#f87171"

def _grade_bg(grade: str) -> str:
    return {"A": "#d1fae5", "B": "#dbeafe", "C": "#fef3c7", "D": "#fee2e2", "F": "#fee2e2"}.get(grade, "#fee2e2")

def _grade_color(grade: str) -> str:
    return {"A": "#166534", "B": "#1e3a8a", "C": "#78450f", "D": "#991b1b", "F": "#991b1b"}.get(grade, "#991b1b")
