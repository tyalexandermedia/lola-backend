"""
JSON-LD schema generators.

Companion to `page_seo_checks.check_schema`: that one DETECTS missing /
incomplete schema; this one GENERATES the corrected block the contractor
can paste into <head>. Tangible weekly retainer deliverable: "Your
LocalBusiness schema is missing X. Paste this:".

All generators return a ready-to-paste string wrapped in
<script type="application/ld+json">…</script>. Deterministic — no LLM
calls, $0 to run.
"""

from __future__ import annotations

import json
from typing import Optional


def _wrap(payload: dict) -> str:
    body = json.dumps(payload, indent=2, ensure_ascii=False)
    return f'<script type="application/ld+json">\n{body}\n</script>'


def generate_local_business_schema(
    business_name: str,
    website: str,
    address: Optional[str] = None,
    phone: Optional[str] = None,
    rating: Optional[float] = None,
    review_count: Optional[int] = None,
    image: Optional[str] = None,
    description: Optional[str] = None,
    service_type: Optional[str] = None,
) -> str:
    """
    LocalBusiness JSON-LD block. Pass whatever you know from the Places
    audit result; missing fields are omitted cleanly (no empty strings or
    null values that would fail Google Rich Results validation).
    """
    payload: dict = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": business_name,
        "url": website,
    }
    if address:
        payload["address"] = {
            "@type": "PostalAddress",
            "streetAddress": address,
        }
    if phone:
        payload["telephone"] = phone
    if image:
        payload["image"] = image
    if description:
        payload["description"] = description
    if service_type:
        payload["@type"] = _service_subtype(service_type)
    if rating is not None and review_count and review_count > 0:
        payload["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": round(float(rating), 1),
            "reviewCount": int(review_count),
        }
    return _wrap(payload)


def generate_website_schema(business_name: str, website: str) -> str:
    """Minimum WebSite block — name + url are the only required fields."""
    return _wrap({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": business_name,
        "url": website,
    })


def generate_organization_schema(
    business_name: str,
    website: str,
    logo: Optional[str] = None,
    same_as: Optional[list[str]] = None,
) -> str:
    """Organization block — name + url required; logo recommended."""
    payload: dict = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": business_name,
        "url": website,
    }
    if logo:
        payload["logo"] = logo
    if same_as:
        payload["sameAs"] = same_as
    return _wrap(payload)


_SERVICE_SUBTYPE_MAP = {
    "soft wash": "HomeAndConstructionBusiness",
    "pressure wash": "HomeAndConstructionBusiness",
    "soft wash / pressure wash": "HomeAndConstructionBusiness",
    "roof cleaning": "HomeAndConstructionBusiness",
    "roofing": "RoofingContractor",
    "hvac": "HVACBusiness",
    "plumbing": "Plumber",
    "pool service": "HomeAndConstructionBusiness",
    "landscaping": "HomeAndConstructionBusiness",
    "pest control": "HomeAndConstructionBusiness",
}


def _service_subtype(service_type: str) -> str:
    """
    Map Lola's homepage trade dropdown to Schema.org's most specific
    LocalBusiness subtype. Defaults to LocalBusiness if no specific match.
    """
    key = (service_type or "").strip().lower()
    return _SERVICE_SUBTYPE_MAP.get(key, "LocalBusiness")


def suggested_schemas_for_audit(audit_business_info: dict, website: str, service_type: Optional[str] = None) -> list[dict]:
    """
    Build the ready-to-paste schema suggestions for an audit response.
    Returns a list of {type, label, html_block} dicts the frontend can
    render as copy-paste cards. Returns [] if we don't have the minimum
    fields (name + website).

    Used by main.py to enrich the page_seo result with deliverables, not
    just findings.
    """
    name = (audit_business_info or {}).get("name") or ""
    if not name or not website:
        return []

    suggestions: list[dict] = [
        {
            "type": "LocalBusiness",
            "label": "LocalBusiness — main schema for your homepage",
            "html_block": generate_local_business_schema(
                business_name=name,
                website=website,
                address=(audit_business_info or {}).get("address"),
                phone=(audit_business_info or {}).get("phone"),
                rating=(audit_business_info or {}).get("rating"),
                review_count=(audit_business_info or {}).get("review_count"),
                service_type=service_type,
            ),
        },
        {
            "type": "WebSite",
            "label": "WebSite — required for sitelinks searchbox in Google",
            "html_block": generate_website_schema(name, website),
        },
    ]
    return suggestions


__all__ = [
    "generate_local_business_schema",
    "generate_website_schema",
    "generate_organization_schema",
    "suggested_schemas_for_audit",
]
