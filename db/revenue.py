"""
Revenue snapshots — the single source of truth for "$ influenced per client."

One row per (slug, period) computed by the Revenue Agent. The `roi_multiple`
field is the primary retainer-justification number: revenue_influenced / fee.
"""

import os
import json
from typing import Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

CREATE_SNAPSHOTS = """
CREATE TABLE IF NOT EXISTS revenue_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    period_start TEXT NOT NULL,           -- ISO date  YYYY-MM-DD
    period_end TEXT NOT NULL,             -- ISO date
    days INTEGER NOT NULL DEFAULT 30,
    calls INTEGER NOT NULL DEFAULT 0,
    leads INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    contacts INTEGER NOT NULL DEFAULT 0,  -- max(calls, leads) for attribution
    jobs_won INTEGER NOT NULL DEFAULT 0,  -- from won_jobs table (actual)
    revenue_actual INTEGER NOT NULL DEFAULT 0,   -- sum of won_jobs.job_value
    revenue_estimated INTEGER NOT NULL DEFAULT 0, -- contacts × close_rate × avg_job
    revenue_influenced INTEGER NOT NULL DEFAULT 0, -- max(actual, estimated)
    monthly_fee INTEGER NOT NULL DEFAULT 0,
    roi_multiple REAL NOT NULL DEFAULT 0.0,
    confidence TEXT NOT NULL DEFAULT 'low',  -- low / medium / high
    attribution_notes TEXT,
    meta_json TEXT,                       -- raw sub-totals for debugging
    created_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_IDX = """
CREATE INDEX IF NOT EXISTS idx_revenue_slug ON revenue_snapshots(slug, created_at DESC);
"""


async def init_revenue_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_SNAPSHOTS)
        await db.execute(CREATE_IDX)
        await db.commit()


async def save_snapshot(slug: str, data: dict) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """INSERT INTO revenue_snapshots
               (slug, period_start, period_end, days, calls, leads, clicks, views,
                contacts, jobs_won, revenue_actual, revenue_estimated, revenue_influenced,
                monthly_fee, roi_multiple, confidence, attribution_notes, meta_json)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                slug.strip().lower(),
                data.get("period_start", ""),
                data.get("period_end", ""),
                int(data.get("days", 30)),
                int(data.get("calls", 0)),
                int(data.get("leads", 0)),
                int(data.get("clicks", 0)),
                int(data.get("views", 0)),
                int(data.get("contacts", 0)),
                int(data.get("jobs_won", 0)),
                int(data.get("revenue_actual", 0)),
                int(data.get("revenue_estimated", 0)),
                int(data.get("revenue_influenced", 0)),
                int(data.get("monthly_fee", 0)),
                float(data.get("roi_multiple", 0.0)),
                data.get("confidence", "low"),
                data.get("attribution_notes", ""),
                json.dumps(data.get("meta", {})),
            ),
        )
        await db.commit()
        return cur.lastrowid


async def get_latest_snapshot(slug: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT * FROM revenue_snapshots WHERE slug = ?
               ORDER BY created_at DESC LIMIT 1""",
            (slug.strip().lower(),),
        ) as cur:
            row = await cur.fetchone()
    if not row:
        return None
    d = dict(row)
    d["meta"] = json.loads(d.pop("meta_json", "{}") or "{}")
    return d


async def get_trend(slug: str, limit: int = 4) -> list:
    """Last N snapshots for sparkline / trend display."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT period_start, period_end, calls, leads, jobs_won,
                      revenue_influenced, roi_multiple, confidence, created_at
               FROM revenue_snapshots WHERE slug = ?
               ORDER BY created_at DESC LIMIT ?""",
            (slug.strip().lower(), limit),
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def get_all_latest() -> list:
    """One latest snapshot per active slug — for the exec dashboard."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT s.* FROM revenue_snapshots s
               INNER JOIN (
                   SELECT slug, MAX(created_at) AS mx FROM revenue_snapshots GROUP BY slug
               ) latest ON s.slug = latest.slug AND s.created_at = latest.mx
               ORDER BY s.roi_multiple DESC"""
        ) as cur:
            rows = await cur.fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["meta"] = json.loads(d.pop("meta_json", "{}") or "{}")
        out.append(d)
    return out
