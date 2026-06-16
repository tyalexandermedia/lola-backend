"""
Lola — Prospect pipeline (sprint engine).

Distinct from db/outreach.py (which logs SENT cold emails). This is the
PRE-send pipeline: businesses you've batch-graded with the Grader but
haven't closed yet. Each row carries the real audit score + the #1 fix +
a ready-to-send draft email, so the operator can work the hottest leads
first and copy/paste outreach.

    prospect_leads   one row per graded business. Ranked by opportunity
                     (revenue leak DESC, score ASC). status walks the
                     pipeline: new → contacted → booked → won (or dead).
"""

import os
from typing import List, Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

STATUSES = ("new", "contacted", "booked", "won", "dead")

CREATE_PROSPECTS = """
CREATE TABLE IF NOT EXISTS prospect_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL,
    city TEXT NOT NULL,
    website TEXT,
    niche TEXT,
    email TEXT,
    owner_first_name TEXT,
    score INTEGER,
    grade TEXT,
    monthly_leak INTEGER DEFAULT 0,
    top_fix TEXT,
    top_fix_detail TEXT,
    draft_subject TEXT,
    draft_body TEXT,
    found_on_google INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
);
"""

CREATE_PROSPECTS_IDX = """
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospect_unique
    ON prospect_leads(business_name, city);
CREATE INDEX IF NOT EXISTS idx_prospect_status ON prospect_leads(status);
"""


async def init_prospect_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_PROSPECTS)
        for stmt in CREATE_PROSPECTS_IDX.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.commit()
    print(f"✅ Prospect pipeline table ready at {DB_PATH}")


async def upsert_prospect(
    business_name: str,
    city: str,
    website: Optional[str],
    niche: Optional[str],
    score: Optional[int],
    grade: Optional[str],
    monthly_leak: int,
    top_fix: Optional[str],
    top_fix_detail: Optional[str],
    draft_subject: str,
    draft_body: str,
    found_on_google: bool,
    email: Optional[str] = None,
    owner_first_name: Optional[str] = None,
) -> int:
    """Upsert by (business_name, city). Re-grading a prospect refreshes the
    score + draft but PRESERVES the operator's status + notes."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO prospect_leads
                 (business_name, city, website, niche, email, owner_first_name,
                  score, grade, monthly_leak, top_fix, top_fix_detail,
                  draft_subject, draft_body, found_on_google, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
               ON CONFLICT(business_name, city) DO UPDATE SET
                 website = excluded.website,
                 niche = excluded.niche,
                 email = COALESCE(excluded.email, prospect_leads.email),
                 owner_first_name = COALESCE(excluded.owner_first_name, prospect_leads.owner_first_name),
                 score = excluded.score,
                 grade = excluded.grade,
                 monthly_leak = excluded.monthly_leak,
                 top_fix = excluded.top_fix,
                 top_fix_detail = excluded.top_fix_detail,
                 draft_subject = excluded.draft_subject,
                 draft_body = excluded.draft_body,
                 found_on_google = excluded.found_on_google,
                 updated_at = datetime('now')""",
            (business_name.strip(), city.strip(), website, niche, email,
             owner_first_name, score, grade, monthly_leak, top_fix, top_fix_detail,
             draft_subject, draft_body, 1 if found_on_google else 0),
        )
        await db.commit()
        async with db.execute(
            "SELECT id FROM prospect_leads WHERE business_name = ? AND city = ?",
            (business_name.strip(), city.strip()),
        ) as cur:
            row = await cur.fetchone()
            return row[0] if row else 0


async def list_prospects(status: Optional[str] = None, limit: int = 200) -> List[dict]:
    """Pipeline view ranked by OPPORTUNITY: biggest revenue leak first, then
    lowest score (most broken = most to gain). Optional status filter."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        q = "SELECT * FROM prospect_leads"
        params: tuple = ()
        if status and status in STATUSES:
            q += " WHERE status = ?"
            params = (status,)
        q += " ORDER BY monthly_leak DESC, score ASC LIMIT ?"
        params = params + (limit,)
        async with db.execute(q, params) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def update_prospect_status(prospect_id: int, status: str, notes: Optional[str] = None) -> bool:
    if status not in STATUSES:
        return False
    async with aiosqlite.connect(DB_PATH) as db:
        if notes is not None:
            cur = await db.execute(
                "UPDATE prospect_leads SET status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?",
                (status, notes, prospect_id),
            )
        else:
            cur = await db.execute(
                "UPDATE prospect_leads SET status = ?, updated_at = datetime('now') WHERE id = ?",
                (status, prospect_id),
            )
        await db.commit()
        return (cur.rowcount or 0) > 0


async def pipeline_stats() -> dict:
    """Counts by status + projected MRR if booked/won close. Drives the
    'are we on track for $5K' header on the admin page."""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT status, COUNT(*) FROM prospect_leads GROUP BY status"
        ) as cur:
            rows = await cur.fetchall()
    counts = {s: 0 for s in STATUSES}
    for status, n in rows:
        counts[status] = int(n)
    counts["total"] = sum(counts[s] for s in STATUSES)
    return counts
