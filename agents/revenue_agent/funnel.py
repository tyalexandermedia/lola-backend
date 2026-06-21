"""
Joins all collected signals into a RevenueSnapshot dataclass.

Attribution logic (conservative, transparent):
  contacts  = max(calls, leads)            — no double-count
  estimated = contacts × close_rate × avg_job_value
  actual    = sum of won_jobs.job_value    — hard number when logged
  influenced = max(actual, estimated)      — whichever is higher / more certain
  roi_multiple = influenced / monthly_fee
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date


@dataclass
class RevenueSnapshot:
    slug: str
    period_start: str
    period_end: str
    days: int
    # raw event counts
    calls: int
    leads: int
    clicks: int
    views: int
    # attribution
    contacts: int           # max(calls, leads)
    jobs_won: int
    revenue_actual: int     # from won_jobs table
    revenue_estimated: int  # contacts × close_rate × avg_job
    revenue_influenced: int # max(actual, estimated)
    monthly_fee: int
    roi_multiple: float
    confidence: str         # low / medium / high
    attribution_notes: str
    meta: dict

    def to_dict(self) -> dict:
        return asdict(self)


def build_snapshot(
    slug: str,
    start: date,
    end: date,
    events: dict,
    calls_detail: dict,
    won_jobs: dict,
    gsc: dict,
    ga4: dict,
    avg_job_value: int,
    close_rate: float,
    monthly_fee: int,
) -> RevenueSnapshot:
    days = (end - start).days + 1
    calls = int(events.get("call", 0)) + int(calls_detail.get("answered", 0))
    leads = int(events.get("lead", 0))
    clicks = int(events.get("click", 0)) + int(gsc.get("organic_clicks", 0))
    views = int(events.get("view", 0))

    contacts = max(calls, leads)
    jobs_won_count = int(won_jobs.get("count", 0))
    revenue_actual = int(won_jobs.get("revenue", 0))
    revenue_estimated = int(round(contacts * close_rate * avg_job_value))
    revenue_influenced = max(revenue_actual, revenue_estimated)

    roi_multiple = round(revenue_influenced / monthly_fee, 2) if monthly_fee > 0 else 0.0

    # Confidence scoring
    data_sources = 0
    notes_parts = []
    if calls > 0:
        data_sources += 2
        notes_parts.append(f"{calls} calls tracked")
    if leads > 0:
        data_sources += 2
        notes_parts.append(f"{leads} form leads")
    if jobs_won_count > 0:
        data_sources += 3
        notes_parts.append(f"{jobs_won_count} won jobs logged (actual revenue)")
    if gsc.get("organic_clicks", 0) > 0:
        data_sources += 1
        notes_parts.append(f"{gsc['organic_clicks']} organic clicks (GSC)")
    if not notes_parts:
        notes_parts.append("no attribution events yet — add tracked links and Twilio number")

    if data_sources >= 5:
        confidence = "high"
    elif data_sources >= 2:
        confidence = "medium"
    else:
        confidence = "low"

    if revenue_actual > 0:
        notes_parts.append("influenced = actual won-job revenue")
    elif contacts > 0:
        notes_parts.append(f"influenced = {contacts} contacts × {int(close_rate*100)}% close × ${avg_job_value} avg job (estimated)")
    else:
        notes_parts.append("no contacts yet — $0 influenced")

    return RevenueSnapshot(
        slug=slug,
        period_start=start.isoformat(),
        period_end=end.isoformat(),
        days=days,
        calls=calls,
        leads=leads,
        clicks=clicks,
        views=views,
        contacts=contacts,
        jobs_won=jobs_won_count,
        revenue_actual=revenue_actual,
        revenue_estimated=revenue_estimated,
        revenue_influenced=revenue_influenced,
        monthly_fee=monthly_fee,
        roi_multiple=roi_multiple,
        confidence=confidence,
        attribution_notes=". ".join(notes_parts),
        meta={
            "calls_detail": calls_detail,
            "won_jobs_detail": won_jobs.get("jobs", [])[:5],
            "gsc": {k: v for k, v in gsc.items() if k != "error"},
            "ga4": {k: v for k, v in ga4.items() if k != "error"},
            "errors": {k: v.get("error") for k, v in {
                "gsc": gsc, "ga4": ga4
            }.items() if v.get("error")},
        },
    )
