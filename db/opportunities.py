"""
Opportunity backlog — ranked, dollar-scored actions per client.

Each row is one detected gap (striking-distance keyword, missing city page,
GBP field, AI-visibility gap) with an impact_score and recommended action.
The Opportunity Agent writes rows; the dashboard and weekly report read them.
"""

import os
import json
from typing import Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

CREATE_OPPORTUNITIES = """
CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    type TEXT NOT NULL,          -- gsc_striking | city_page | gbp_gap | ai_visibility | competitor
    title TEXT NOT NULL,
    query_or_gap TEXT,           -- the keyword / city / field / query in question
    est_monthly_clicks INTEGER DEFAULT 0,
    est_jobs_won REAL DEFAULT 0,
    est_revenue INTEGER DEFAULT 0,
    effort_days INTEGER DEFAULT 3,
    impact_score REAL DEFAULT 0,
    recommended_action TEXT,
    aeo_draft_json TEXT,         -- auto-drafted AEO block if type=ai_visibility
    status TEXT NOT NULL DEFAULT 'open',  -- open | in_progress | done | dismissed
    data_json TEXT,              -- raw signal data for debugging
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
);
"""

CREATE_IDX = """
CREATE INDEX IF NOT EXISTS idx_opp_slug ON opportunities(slug, status, impact_score DESC);
"""


async def init_opportunity_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_OPPORTUNITIES)
        await db.execute(CREATE_IDX)
        await db.commit()


async def upsert_opportunity(slug: str, opp: dict) -> int:
    """Insert or replace an opportunity (matched on slug + type + query_or_gap)."""
    async with aiosqlite.connect(DB_PATH) as db:
        # Check for existing open row with same slug+type+query
        async with db.execute(
            """SELECT id FROM opportunities
               WHERE slug=? AND type=? AND query_or_gap=? AND status='open'""",
            (slug.strip().lower(), opp.get("type", ""), opp.get("query_or_gap", "")),
        ) as cur:
            existing = await cur.fetchone()

        if existing:
            await db.execute(
                """UPDATE opportunities
                   SET title=?, est_monthly_clicks=?, est_jobs_won=?, est_revenue=?,
                       effort_days=?, impact_score=?, recommended_action=?,
                       aeo_draft_json=?, data_json=?, updated_at=datetime('now')
                   WHERE id=?""",
                (
                    opp.get("title", ""),
                    int(opp.get("est_monthly_clicks", 0)),
                    float(opp.get("est_jobs_won", 0)),
                    int(opp.get("est_revenue", 0)),
                    int(opp.get("effort_days", 3)),
                    float(opp.get("impact_score", 0)),
                    opp.get("recommended_action", ""),
                    json.dumps(opp.get("aeo_draft")) if opp.get("aeo_draft") else None,
                    json.dumps(opp.get("data", {})),
                    existing[0],
                ),
            )
            await db.commit()
            return existing[0]
        else:
            cur = await db.execute(
                """INSERT INTO opportunities
                   (slug, type, title, query_or_gap, est_monthly_clicks, est_jobs_won,
                    est_revenue, effort_days, impact_score, recommended_action,
                    aeo_draft_json, data_json)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    slug.strip().lower(),
                    opp.get("type", ""),
                    opp.get("title", ""),
                    opp.get("query_or_gap", ""),
                    int(opp.get("est_monthly_clicks", 0)),
                    float(opp.get("est_jobs_won", 0)),
                    int(opp.get("est_revenue", 0)),
                    int(opp.get("effort_days", 3)),
                    float(opp.get("impact_score", 0)),
                    opp.get("recommended_action", ""),
                    json.dumps(opp.get("aeo_draft")) if opp.get("aeo_draft") else None,
                    json.dumps(opp.get("data", {})),
                ),
            )
            await db.commit()
            return cur.lastrowid


async def get_opportunities(slug: str, status: str = "open", limit: int = 20) -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT * FROM opportunities WHERE slug=? AND status=?
               ORDER BY impact_score DESC LIMIT ?""",
            (slug.strip().lower(), status, limit),
        ) as cur:
            rows = await cur.fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["data"] = json.loads(d.pop("data_json", "{}") or "{}")
        if d.get("aeo_draft_json"):
            d["aeo_draft"] = json.loads(d.pop("aeo_draft_json"))
        else:
            d.pop("aeo_draft_json", None)
            d["aeo_draft"] = None
        out.append(d)
    return out


async def update_status(opp_id: int, status: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE opportunities SET status=?, updated_at=datetime('now') WHERE id=?",
            (status, opp_id),
        )
        await db.commit()
    return True
