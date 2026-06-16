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
