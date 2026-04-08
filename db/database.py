import aiosqlite
import json
import os
from datetime import datetime
from typing import Optional, List

DB_PATH = os.getenv("DB_PATH", "lola.db")

CREATE_AUDITS = """
CREATE TABLE IF NOT EXISTS audits (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    business_name TEXT NOT NULL,
    website TEXT NOT NULL,
    city TEXT NOT NULL,
    business_type TEXT NOT NULL,
    total_score INTEGER,
    grade TEXT,
    revenue_leak INTEGER,
    biggest_bottleneck TEXT,
    segment TEXT,
    confidence_score INTEGER,
    raw_result TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_BASELINES = """
CREATE TABLE IF NOT EXISTS check_baselines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_type TEXT NOT NULL,
    city TEXT NOT NULL,
    avg_score REAL DEFAULT 0,
    sample_count INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(business_type, city)
);
"""

CREATE_IDX = """
CREATE INDEX IF NOT EXISTS idx_audits_email ON audits(email);
CREATE INDEX IF NOT EXISTS idx_audits_created ON audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_baselines_type_city ON check_baselines(business_type, city);
"""


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_AUDITS)
        await db.execute(CREATE_BASELINES)
        for stmt in CREATE_IDX.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.commit()
    print(f"✅ Database initialized at {DB_PATH}")


async def save_audit(audit_id: str, data: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT OR REPLACE INTO audits
              (id, email, business_name, website, city, business_type,
               total_score, grade, revenue_leak, biggest_bottleneck,
               segment, confidence_score, raw_result)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            audit_id,
            data.get("email", ""),
            data.get("business_name", ""),
            data.get("website", ""),
            data.get("city", ""),
            data.get("business_type", ""),
            data.get("total_score"),
            data.get("grade"),
            data.get("revenue_leak_monthly"),
            data.get("biggest_bottleneck", {}).get("title", "") if isinstance(data.get("biggest_bottleneck"), dict) else "",
            data.get("segment", ""),
            data.get("confidence_score"),
            json.dumps(data),
        ))
        await db.commit()

    # Update rolling baseline
    await _update_baseline(
        data.get("business_type", "default"),
        data.get("city", ""),
        data.get("total_score", 0),
    )


async def _update_baseline(business_type: str, city: str, score: int):
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT avg_score, sample_count FROM check_baselines WHERE business_type=? AND city=?",
            (business_type, city.lower()),
        ) as cur:
            row = await cur.fetchone()
        if row:
            new_avg = (row[0] * row[1] + score) / (row[1] + 1)
            new_count = row[1] + 1
            await db.execute(
                "UPDATE check_baselines SET avg_score=?, sample_count=?, updated_at=datetime('now') WHERE business_type=? AND city=?",
                (new_avg, new_count, business_type, city.lower()),
            )
        else:
            await db.execute(
                "INSERT INTO check_baselines (business_type, city, avg_score, sample_count) VALUES (?,?,?,1)",
                (business_type, city.lower(), float(score)),
            )
        await db.commit()


async def get_percentile(business_type: str, city: str, score: int) -> int:
    """Returns estimated percentile (0-100) for this score vs stored baselines."""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT avg_score, sample_count FROM check_baselines WHERE business_type=?",
            (business_type,),
        ) as cur:
            rows = await cur.fetchall()
    if not rows:
        # No data — estimate based on national average (~42 for local businesses)
        national_avg = 42
        if score > national_avg + 20:
            return 80
        elif score > national_avg:
            return 60
        elif score > national_avg - 10:
            return 40
        else:
            return 20
    # Weighted average across all cities for this type
    total_weight = sum(r[1] for r in rows)
    weighted_avg = sum(r[0] * r[1] for r in rows) / total_weight if total_weight else 42
    # Rough normal distribution estimate (std dev ~15 for local biz scores)
    std_dev = 15
    z = (score - weighted_avg) / std_dev
    # Convert z to percentile (approximation)
    import math
    percentile = int(50 * (1 + math.erf(z / math.sqrt(2))))
    return max(1, min(99, percentile))


async def get_recent_leads(limit: int = 50) -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, email, business_name, website, city, business_type, total_score, grade, revenue_leak, segment, created_at FROM audits ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]
