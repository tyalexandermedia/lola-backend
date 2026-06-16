"""
Lola — Call / Lead / Click attribution tracking.

The billing-justification layer: every tracked event ties to a client slug
so the dashboard can show "this month: 12 calls · 7 leads · 340 clicks" —
the proof that earns (and raises) the retainer.

Capture happens via first-party tracked links the client puts on their
GBP + site (see main.py /t/* endpoints):
    call   → click-to-call redirect (tel:)
    click  → tracked outbound/website link
    lead   → form-submit POST
    view   → 1x1 pixel
"""

import os
import json
import hashlib
from typing import List, Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

EVENT_TYPES = ("call", "lead", "click", "view")

CREATE_EVENTS = """
CREATE TABLE IF NOT EXISTS tracked_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    event_type TEXT NOT NULL,
    source TEXT,
    meta_json TEXT,
    ip_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_EVENTS_IDX = """
CREATE INDEX IF NOT EXISTS idx_events_slug_type ON tracked_events(slug, event_type, created_at);
"""


async def init_tracking_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_EVENTS)
        for stmt in CREATE_EVENTS_IDX.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.commit()
    print(f"✅ Tracking table ready at {DB_PATH}")


def hash_ip(ip: Optional[str]) -> Optional[str]:
    if not ip:
        return None
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


async def log_event(
    slug: str,
    event_type: str,
    source: Optional[str] = None,
    meta: Optional[dict] = None,
    ip: Optional[str] = None,
) -> int:
    if event_type not in EVENT_TYPES:
        event_type = "click"
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """INSERT INTO tracked_events (slug, event_type, source, meta_json, ip_hash)
               VALUES (?, ?, ?, ?, ?)""",
            (slug.strip().lower(), event_type, source,
             json.dumps(meta or {})[:1000], hash_ip(ip)),
        )
        await db.commit()
        return cur.lastrowid or 0


async def counts_for_slug(slug: str) -> dict:
    """Per-event-type counts across three windows: this calendar month,
    last 30 days, and lifetime. Drives the dashboard billing row."""
    slug_l = slug.strip().lower()
    out = {t: {"month": 0, "last_30d": 0, "lifetime": 0} for t in EVENT_TYPES}
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """SELECT event_type,
                   SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m','now') THEN 1 ELSE 0 END) AS month,
                   SUM(CASE WHEN created_at >= datetime('now','-30 days') THEN 1 ELSE 0 END) AS last_30d,
                   COUNT(*) AS lifetime
               FROM tracked_events WHERE slug = ?
               GROUP BY event_type""",
            (slug_l,),
        ) as cur:
            for row in await cur.fetchall():
                et = row[0]
                if et in out:
                    out[et] = {"month": int(row[1] or 0), "last_30d": int(row[2] or 0), "lifetime": int(row[3] or 0)}
    return out


async def funnel_for_slug(slug: str) -> dict:
    """View → Click → Call → Lead conversion funnel for the current month.
    Each step's drop-off % proves the system compounds — the client sees
    Lola's work at every stage, not just the final number."""
    slug_l = slug.strip().lower()
    out = {"view": 0, "click": 0, "call": 0, "lead": 0}
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """SELECT event_type, COUNT(*) FROM tracked_events
               WHERE slug = ?
                 AND strftime('%Y-%m', created_at) = strftime('%Y-%m','now')
               GROUP BY event_type""",
            (slug_l,),
        ) as cur:
            for et, n in await cur.fetchall():
                if et in out:
                    out[et] = int(n)
    def _pct(num: int, den: int) -> float:
        return round(100 * num / den, 1) if den else 0.0
    return {
        "view": out["view"],
        "click": out["click"],
        "call": out["call"],
        "lead": out["lead"],
        "click_rate": _pct(out["click"], out["view"]),
        "call_rate": _pct(out["call"], out["click"]),
        "lead_rate": _pct(out["lead"], out["click"]),
        "overall": _pct(out["call"] + out["lead"], out["view"]),
    }


async def trend_deltas(slug: str) -> dict:
    """Per-event-type 'this month vs last month' counts + delta + arrow.
    The momentum signal — what makes a client renew (or raise) vs churn."""
    slug_l = slug.strip().lower()
    out: dict = {t: {"month": 0, "prev_month": 0, "delta": 0, "arrow": "·"} for t in EVENT_TYPES}
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """SELECT event_type,
                   SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m','now') THEN 1 ELSE 0 END) AS m,
                   SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m','now','start of month','-1 day','start of month') THEN 1 ELSE 0 END) AS pm
               FROM tracked_events WHERE slug = ?
               GROUP BY event_type""",
            (slug_l,),
        ) as cur:
            for et, m, pm in await cur.fetchall():
                if et in out:
                    m_i, pm_i = int(m or 0), int(pm or 0)
                    delta = m_i - pm_i
                    out[et] = {
                        "month": m_i, "prev_month": pm_i, "delta": delta,
                        "arrow": "↑" if delta > 0 else "↓" if delta < 0 else "·",
                    }
    return out


def cost_per_lead(counts: dict, monthly_retainer: int) -> dict:
    """CPL = retainer / contacts this month. The number that lets you raise
    the retainer ('our CPL is $30, paid ads is $80 — we're cheaper AND we
    own the channel')."""
    calls = int(((counts or {}).get("call") or {}).get("month", 0))
    leads = int(((counts or {}).get("lead") or {}).get("month", 0))
    contacts = max(calls, leads)
    if contacts <= 0:
        return {"cpl": None, "contacts": 0, "retainer": monthly_retainer}
    return {
        "cpl": round(monthly_retainer / contacts, 2),
        "contacts": contacts,
        "retainer": monthly_retainer,
    }


def annualized_value(attributed: dict) -> dict:
    """Project the current month's attributed value forward 12mo. Frames
    the retainer in annual terms — what feels small monthly feels big
    yearly. Conservative: just monthly × 12, no growth assumption."""
    monthly = int((attributed or {}).get("value") or 0)
    return {"yearly_run_rate": monthly * 12, "monthly": monthly}


async def counts_by_source(slug: str) -> dict:
    """Per-event-type counts grouped by `source` (gbp, website, ai_search,
    social, etc.). Powers the dashboard attribution view: 'this month's
    calls — 8 from GBP, 3 from website, 1 from AI search'.

    Returns: { 'call': { 'gbp': 8, 'website': 3, 'ai_search': 1 }, ... }
    only for the current calendar month."""
    out: dict = {t: {} for t in EVENT_TYPES}
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """SELECT event_type, COALESCE(source,'(direct)') AS source, COUNT(*)
               FROM tracked_events
               WHERE slug = ?
                 AND strftime('%Y-%m', created_at) = strftime('%Y-%m','now')
               GROUP BY event_type, source""",
            (slug.strip().lower(),),
        ) as cur:
            for et, src, n in await cur.fetchall():
                if et in out:
                    out[et][src] = int(n)
    return out


def attributed_value(counts: dict, avg_job_value: int = 400, close_rate: float = 0.30) -> dict:
    """Estimated revenue Lola drove this month. Conservative: calls × close
    rate × avg job value (no double-count of leads-that-also-called).
    Returns the math so the client can see how we got there — no black box."""
    calls = int(((counts or {}).get("call") or {}).get("month", 0))
    leads = int(((counts or {}).get("lead") or {}).get("month", 0))
    # Effective contacts = max(calls, leads) so we don't over-attribute a
    # lead that also called. Same logic the leak calculator uses.
    contacts = max(calls, leads)
    closed_est = contacts * max(0.0, min(1.0, close_rate))
    return {
        "value": int(round(closed_est * max(0, avg_job_value))),
        "contacts": contacts,
        "calls": calls,
        "leads": leads,
        "close_rate": close_rate,
        "avg_job_value": avg_job_value,
    }


async def recent_events(slug: str, limit: int = 50) -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT event_type, source, meta_json, created_at
               FROM tracked_events WHERE slug = ?
               ORDER BY created_at DESC LIMIT ?""",
            (slug.strip().lower(), limit),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]
