"""
Applications table — stores /apply form submissions from the Retainer/Pro
pre-qualification flow.

One row per submission. No auth required to insert (it's a public form);
admin views use the same LOLA_SECRET_ADMIN_KEY header pattern as /leads.
"""

import os
import aiosqlite
from datetime import datetime
from typing import List, Optional

DB_PATH = os.getenv("DB_PATH", "lola.db")

CREATE_APPLICATIONS = """
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    business_name TEXT NOT NULL,
    website TEXT NOT NULL,
    monthly_revenue TEXT NOT NULL,
    trade TEXT NOT NULL,
    frustration TEXT,
    tier TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    contacted_at TEXT,
    notes TEXT
);
"""

CREATE_IDX = """
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_created ON applications(created_at DESC);
"""


async def init_applications_table() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_APPLICATIONS)
        for stmt in CREATE_IDX.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.commit()
    print(f"✅ Applications table ready at {DB_PATH}")


async def save_application(
    first_name: str,
    last_name: str,
    email: str,
    business_name: str,
    website: str,
    monthly_revenue: str,
    trade: str,
    frustration: str,
    tier: str,
) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """INSERT INTO applications
               (first_name, last_name, email, business_name, website,
                monthly_revenue, trade, frustration, tier)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (first_name, last_name, email, business_name, website,
             monthly_revenue, trade, frustration or None, tier),
        )
        await db.commit()
        return cur.lastrowid or 0


async def get_recent_applications(limit: int = 50) -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT id, first_name, last_name, email, business_name, website,
                      monthly_revenue, trade, frustration, tier,
                      created_at, contacted_at, notes
               FROM applications
               ORDER BY created_at DESC
               LIMIT ?""",
            (limit,),
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]
