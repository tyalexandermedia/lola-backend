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

# Call-tracking table — one row per inbound call to a Lola tracking number.
# Captures the ACTUAL caller ID + duration via the Twilio voice webhook, so
# the client can see "(727) 555-0142 called for 4m12s on Tue" — undeniable
# proof, not just a click count. Caller numbers are PII → never surfaced on
# the public dashboard; admin-only + the client's own private report.
CREATE_CALLS = """
CREATE TABLE IF NOT EXISTS tracked_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    call_sid TEXT UNIQUE,
    caller_number TEXT,
    caller_city TEXT,
    caller_state TEXT,
    tracking_number TEXT,
    forwarded_to TEXT,
    source TEXT,
    status TEXT,
    duration_sec INTEGER DEFAULT 0,
    recording_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_CALLS_IDX = """
CREATE INDEX IF NOT EXISTS idx_calls_slug ON tracked_calls(slug, created_at);
"""

CREATE_WON_JOBS = """
CREATE TABLE IF NOT EXISTS won_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    call_sid TEXT,           -- optional link to tracked_calls row
    opportunity_id INTEGER,  -- optional link to revenue_opportunities row
    job_value INTEGER NOT NULL,
    service_type TEXT,       -- e.g. "roof cleaning", "soft wash"
    source TEXT,             -- gbp / callrail / website / ai_search
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_WON_JOBS_IDX = """
CREATE INDEX IF NOT EXISTS idx_won_jobs_slug ON won_jobs(slug, created_at);
"""


async def init_tracking_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_EVENTS)
        await db.execute(CREATE_CALLS)
        for stmt in (CREATE_EVENTS_IDX + CREATE_CALLS_IDX).strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.execute(CREATE_WON_JOBS)
        async with db.execute("PRAGMA table_info(won_jobs)") as cur:
            cols = {row[1] for row in await cur.fetchall()}
        if "opportunity_id" not in cols:
            await db.execute("ALTER TABLE won_jobs ADD COLUMN opportunity_id INTEGER")
        await db.execute(CREATE_WON_JOBS_IDX)
        await db.commit()
    print(f"✅ Tracking tables ready at {DB_PATH}")


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


async def won_jobs_stats(slug: str) -> dict:
    """Actual closed-deal stats for the client. Separate from attributed_value
    (which is estimated from contacts × close_rate); this is the REAL number
    when the operator logs a confirmed won job."""
    slug_l = slug.strip().lower()
    out = {"month": 0, "lifetime": 0, "revenue_month": 0, "revenue_lifetime": 0, "jobs": []}
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT id, call_sid, opportunity_id, job_value, service_type, source, notes, created_at
               FROM won_jobs WHERE slug = ? ORDER BY created_at DESC""",
            (slug_l,),
        ) as cur:
            rows = await cur.fetchall()
    for r in rows:
        val = int(r["job_value"] or 0)
        out["lifetime"] += 1
        out["revenue_lifetime"] += val
        # "this month" = same calendar month as today
        try:
            from datetime import date
            ca = r["created_at"][:7]  # YYYY-MM
            if ca == date.today().strftime("%Y-%m"):
                out["month"] += 1
                out["revenue_month"] += val
        except Exception:
            pass
        out["jobs"].append({
            "id": r["id"],
            "opportunity_id": r["opportunity_id"],
            "job_value": val,
            "service_type": r["service_type"],
            "source": r["source"],
            "notes": r["notes"],
            "created_at": r["created_at"],
        })
    return out


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


# ── Call tracking (Twilio-backed caller ID + duration) ────────────


def mask_number(num: Optional[str]) -> str:
    """(727) •••-••42 style mask. Used anywhere a number might reach a
    semi-public surface. Admin log shows the full number."""
    if not num:
        return "Unknown"
    digits = "".join(c for c in num if c.isdigit())
    if len(digits) < 4:
        return "Unknown"
    last2 = digits[-2:]
    area = digits[-10:-7] if len(digits) >= 10 else "•••"
    return f"({area}) •••-••{last2}"


async def log_call(
    slug: str, call_sid: str, caller_number: Optional[str], tracking_number: Optional[str],
    forwarded_to: Optional[str], source: Optional[str] = None,
    caller_city: Optional[str] = None, caller_state: Optional[str] = None,
) -> int:
    """Insert (or no-op on duplicate SID) an inbound call at answer time.
    Duration + recording land later via the status callback."""
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """INSERT INTO tracked_calls
                 (slug, call_sid, caller_number, caller_city, caller_state,
                  tracking_number, forwarded_to, source, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ringing')
               ON CONFLICT(call_sid) DO NOTHING""",
            (slug.strip().lower(), call_sid, caller_number, caller_city, caller_state,
             tracking_number, forwarded_to, source),
        )
        await db.commit()
        return cur.lastrowid or 0


async def update_call_status(call_sid: str, status: str, duration_sec: int = 0,
                             recording_url: Optional[str] = None) -> bool:
    """Status callback — stamps final disposition + duration (+ recording)."""
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """UPDATE tracked_calls
               SET status = ?, duration_sec = ?,
                   recording_url = COALESCE(?, recording_url)
               WHERE call_sid = ?""",
            (status, int(duration_sec or 0), recording_url, call_sid),
        )
        await db.commit()
        return (cur.rowcount or 0) > 0


async def call_quality_stats(slug: str) -> dict:
    """PUBLIC-safe call quality for the dashboard — counts + duration
    buckets, NO caller numbers. 'Qualified' = answered & >= 30s (filters
    out hangups/wrong numbers), the calls most likely to be real jobs."""
    slug_l = slug.strip().lower()
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """SELECT
                 SUM(CASE WHEN strftime('%Y-%m', created_at)=strftime('%Y-%m','now') THEN 1 ELSE 0 END) AS month,
                 SUM(CASE WHEN strftime('%Y-%m', created_at)=strftime('%Y-%m','now') AND duration_sec>=30 THEN 1 ELSE 0 END) AS qualified_month,
                 SUM(CASE WHEN strftime('%Y-%m', created_at)=strftime('%Y-%m','now') AND duration_sec>=120 THEN 1 ELSE 0 END) AS long_month,
                 COUNT(*) AS lifetime,
                 COALESCE(AVG(CASE WHEN duration_sec>0 THEN duration_sec END),0) AS avg_dur
               FROM tracked_calls WHERE slug = ?""",
            (slug_l,),
        ) as cur:
            r = await cur.fetchone()
    return {
        "month": int((r[0] or 0) if r else 0),
        "qualified_month": int((r[1] or 0) if r else 0),
        "long_month": int((r[2] or 0) if r else 0),
        "lifetime": int((r[3] or 0) if r else 0),
        "avg_duration_sec": int((r[4] or 0) if r else 0),
    }


async def recent_calls_admin(slug: str, limit: int = 50) -> List[dict]:
    """ADMIN-only — full caller numbers + durations. For Coach Ty's review
    and the client's private weekly report. Never hit from the public route."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT id, caller_number, caller_city, caller_state, source,
                      status, duration_sec, recording_url, created_at
               FROM tracked_calls WHERE slug = ?
               ORDER BY created_at DESC LIMIT ?""",
            (slug.strip().lower(), limit),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


# ── Google Search Console snapshots (free data, cached) ───────────
# GSC is the client's REAL Google performance — impressions, clicks, CTR,
# avg position, top queries. Free from Google once the client adds our
# service account to their property. We cache the latest pull per slug so
# the public dashboard reads instantly (never hits the GSC API per view).
CREATE_GSC = """
CREATE TABLE IF NOT EXISTS gsc_snapshots (
    slug TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    fetched_at TEXT DEFAULT (datetime('now'))
);
"""


async def save_gsc_snapshot(slug: str, data: dict) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_GSC)
        await db.execute(
            """INSERT INTO gsc_snapshots (slug, data_json, fetched_at)
               VALUES (?, ?, datetime('now'))
               ON CONFLICT(slug) DO UPDATE SET data_json=excluded.data_json, fetched_at=datetime('now')""",
            (slug.strip().lower(), json.dumps(data)[:20000]),
        )
        await db.commit()


async def get_gsc_snapshot(slug: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_GSC)
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT data_json, fetched_at FROM gsc_snapshots WHERE slug = ?",
            (slug.strip().lower(),),
        ) as cur:
            row = await cur.fetchone()
    if not row:
        return None
    try:
        data = json.loads(row["data_json"])
        data["fetched_at"] = row["fetched_at"]
        return data
    except Exception:
        return None


# ── Generic provider snapshots (gbp / bing / cwv / …) ─────────────
# One table, keyed by (slug, provider). Lets us cache any external
# metric source the same way as GSC without a table per provider.
CREATE_PROVIDER = """
CREATE TABLE IF NOT EXISTS provider_snapshots (
    slug TEXT NOT NULL,
    provider TEXT NOT NULL,
    data_json TEXT NOT NULL,
    fetched_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (slug, provider)
);
"""


async def save_provider_snapshot(slug: str, provider: str, data: dict) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_PROVIDER)
        await db.execute(
            """INSERT INTO provider_snapshots (slug, provider, data_json, fetched_at)
               VALUES (?, ?, ?, datetime('now'))
               ON CONFLICT(slug, provider) DO UPDATE SET
                 data_json = excluded.data_json, fetched_at = datetime('now')""",
            (slug.strip().lower(), provider, json.dumps(data)[:20000]),
        )
        await db.commit()


async def get_provider_snapshot(slug: str, provider: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_PROVIDER)
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT data_json, fetched_at FROM provider_snapshots WHERE slug = ? AND provider = ?",
            (slug.strip().lower(), provider),
        ) as cur:
            row = await cur.fetchone()
    if not row:
        return None
    try:
        d = json.loads(row["data_json"])
        d["fetched_at"] = row["fetched_at"]
        return d
    except Exception:
        return None


async def cwv_history(slug: str, limit: int = 12) -> List[dict]:
    """Core Web Vitals snapshots over time for the trend sparkline. Stored
    as provider='cwv' but we keep a rolling series in a dedicated table so
    we can chart the trend (provider_snapshots only holds the latest)."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS cwv_series (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT NOT NULL,
                performance INTEGER, accessibility INTEGER, seo INTEGER,
                run_at TEXT DEFAULT (datetime('now'))
            )""")
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT performance, accessibility, seo, run_at FROM cwv_series WHERE slug = ? ORDER BY run_at ASC LIMIT ?",
            (slug.strip().lower(), limit),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def save_cwv(slug: str, performance: int, accessibility: int, seo: int) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS cwv_series (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT NOT NULL,
                performance INTEGER, accessibility INTEGER, seo INTEGER,
                run_at TEXT DEFAULT (datetime('now'))
            )""")
        await db.execute(
            "INSERT INTO cwv_series (slug, performance, accessibility, seo) VALUES (?, ?, ?, ?)",
            (slug.strip().lower(), performance, accessibility, seo),
        )
        await db.commit()
