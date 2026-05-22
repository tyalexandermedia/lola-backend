"""
Lola SEO — Lead scoring (Phase 1).

Lead scoring lives next to the audit store, but in its own table so we can
query "hot leads" / "warm leads" without scanning the full audits log.

Warm vs cold separation (Phase 1 rule):

    hot   ≥75   urgent pain, big leak, GBP exists but is rough
                → Agent 5 will sequence aggressively (D+0/2/5)
    warm  50-74 meaningful pain, ready to talk
                → Agent 5 will sequence with normal cadence
    cool  25-49 some pain, education-mode
                → weekly drip (Phase 2)
    cold  <25   already optimized
                → quarterly check-in only (Phase 2)

Phase 1 only writes the score + temperature. The nurture sequencer (Agent 5)
lives in `agents/nurture.py` and is intentionally a stub.
"""

import aiosqlite
import os
from typing import List, Tuple

DB_PATH = os.getenv("DB_PATH", "lola.db")


CREATE_LEAD_SCORES = """
CREATE TABLE IF NOT EXISTS lead_scores (
    email TEXT PRIMARY KEY,
    last_audit_id TEXT,
    business_name TEXT,
    seo_score INTEGER,
    monthly_leak INTEGER,
    lead_score INTEGER NOT NULL,
    temperature TEXT NOT NULL,
    segment TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_IDX = """
CREATE INDEX IF NOT EXISTS idx_lead_temperature ON lead_scores(temperature);
CREATE INDEX IF NOT EXISTS idx_lead_score_desc ON lead_scores(lead_score DESC);
"""


async def init_leads_table():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_LEAD_SCORES)
        for stmt in CREATE_IDX.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.commit()
    print(f"✅ Lead scores table ready at {DB_PATH}")


def classify_temperature(
    seo_score: int,
    monthly_leak: int,
    verification_confidence: str,
    has_website: bool,
) -> Tuple[int, str]:
    """
    Composite lead score and temperature label.

    Inputs intentionally cheap — all already computed by /audit.

    Weights:
      - SEO pain (inverse score)               max 40 pts
      - Revenue leak (capped at $20k/mo)       max 40 pts
      - GBP confidence (medium is the sweet spot — present but improvable)
                                               max 15 pts
      - Has website                            max 5 pts

    Returns (lead_score 0-100, temperature).
    """
    score = 0
    score += max(0, min(40, int((100 - seo_score) * 0.4)))

    leak_cap = 20000
    score += max(0, min(40, int((monthly_leak / leak_cap) * 40)))

    if verification_confidence == "medium":
        score += 15
    elif verification_confidence == "low":
        score += 8
    elif verification_confidence == "high":
        score += 5

    if has_website:
        score += 5

    score = max(0, min(100, score))

    if score >= 75:
        temp = "hot"
    elif score >= 50:
        temp = "warm"
    elif score >= 25:
        temp = "cool"
    else:
        temp = "cold"

    return score, temp


async def upsert_lead(
    audit_id: str,
    email: str,
    business_name: str,
    lead_score: int,
    temperature: str,
    segment: str,
    seo_score: int,
    monthly_leak: int,
):
    if not email:
        return
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO lead_scores
              (email, last_audit_id, business_name, seo_score, monthly_leak,
               lead_score, temperature, segment, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(email) DO UPDATE SET
              last_audit_id=excluded.last_audit_id,
              business_name=excluded.business_name,
              seo_score=excluded.seo_score,
              monthly_leak=excluded.monthly_leak,
              lead_score=excluded.lead_score,
              temperature=excluded.temperature,
              segment=excluded.segment,
              updated_at=datetime('now')
            """,
            (
                email,
                audit_id,
                business_name,
                seo_score,
                monthly_leak,
                lead_score,
                temperature,
                segment,
            ),
        )
        await db.commit()


async def get_warm_leads(limit: int = 50, only_hot: bool = False) -> List[dict]:
    """
    Return recent warm-or-hotter leads joined with their latest audit row.
    Used by /leads?temperature=warm and /leads?temperature=hot.
    """
    temps = ("hot",) if only_hot else ("hot", "warm")
    placeholders = ",".join("?" for _ in temps)
    sql = f"""
        SELECT a.id, a.email, a.business_name, a.website, a.city,
               a.business_type, a.total_score, a.grade, a.revenue_leak,
               a.segment, a.created_at,
               l.lead_score, l.temperature
        FROM lead_scores l
        JOIN audits a ON a.id = l.last_audit_id
        WHERE l.temperature IN ({placeholders})
        ORDER BY l.lead_score DESC, l.updated_at DESC
        LIMIT ?
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(sql, (*temps, limit)) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]
