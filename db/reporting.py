"""
SQLite storage for Agent Two — weekly reporting agent.

Two tables:
1. reporting_clients — per-client config (top 5 keywords, conversion rate,
   avg job value, Brevo template, email, GSC/GA property IDs)
2. reporting_sends — audit log per send (status, error, email preview)
"""

import os
import json
import aiosqlite
from typing import List, Optional

DB_PATH = os.getenv("DB_PATH", "lola.db")

CREATE_CLIENTS = """
CREATE TABLE IF NOT EXISTS reporting_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,            -- e.g. "sandbar"
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,           -- recipient
    site_url TEXT NOT NULL,
    money_keywords_json TEXT NOT NULL,    -- JSON list[str], top 5
    conversion_rate REAL NOT NULL DEFAULT 0.03,   -- contractor industry default
    avg_job_value INTEGER NOT NULL DEFAULT 400,
    brevo_template_id INTEGER,            -- optional override of global
    gsc_property TEXT,                    -- e.g. "sc-domain:sandbarsoftwash.com"
    ga_property_id TEXT,                  -- e.g. "properties/123456789"
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
);
"""

CREATE_SENDS = """
CREATE TABLE IF NOT EXISTS reporting_sends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    week_of TEXT NOT NULL,                -- ISO date of the Monday
    status TEXT NOT NULL,                 -- 'sent' | 'fetch_failed' | 'claude_failed' | 'brevo_failed'
    error TEXT,
    email_subject TEXT,
    email_preview TEXT,                   -- first ~500 chars
    data_snapshot_json TEXT,              -- full input data for debug
    sent_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_IDX = """
CREATE INDEX IF NOT EXISTS idx_reporting_clients_slug ON reporting_clients(slug);
CREATE INDEX IF NOT EXISTS idx_reporting_sends_slug_week ON reporting_sends(slug, week_of DESC);
"""


async def init_reporting_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_CLIENTS)
        await db.execute(CREATE_SENDS)
        for stmt in CREATE_IDX.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.commit()
    print(f"✅ Reporting agent tables ready at {DB_PATH}")


async def get_active_clients() -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM reporting_clients WHERE active = 1 ORDER BY slug"
        ) as cur:
            rows = await cur.fetchall()
            out = []
            for r in rows:
                d = dict(r)
                try:
                    d["money_keywords"] = json.loads(d.pop("money_keywords_json") or "[]")
                except Exception:
                    d["money_keywords"] = []
                out.append(d)
            return out


async def get_client_by_slug(slug: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM reporting_clients WHERE slug = ?", (slug,)
        ) as cur:
            row = await cur.fetchone()
            if not row:
                return None
            d = dict(row)
            try:
                d["money_keywords"] = json.loads(d.pop("money_keywords_json") or "[]")
            except Exception:
                d["money_keywords"] = []
            return d


async def upsert_client(
    slug: str,
    client_name: str,
    client_email: str,
    site_url: str,
    money_keywords: List[str],
    conversion_rate: float = 0.03,
    avg_job_value: int = 400,
    brevo_template_id: Optional[int] = None,
    gsc_property: Optional[str] = None,
    ga_property_id: Optional[str] = None,
    active: bool = True,
) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO reporting_clients
               (slug, client_name, client_email, site_url, money_keywords_json,
                conversion_rate, avg_job_value, brevo_template_id, gsc_property,
                ga_property_id, active, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
               ON CONFLICT(slug) DO UPDATE SET
                 client_name = excluded.client_name,
                 client_email = excluded.client_email,
                 site_url = excluded.site_url,
                 money_keywords_json = excluded.money_keywords_json,
                 conversion_rate = excluded.conversion_rate,
                 avg_job_value = excluded.avg_job_value,
                 brevo_template_id = excluded.brevo_template_id,
                 gsc_property = excluded.gsc_property,
                 ga_property_id = excluded.ga_property_id,
                 active = excluded.active,
                 updated_at = datetime('now')""",
            (slug, client_name, client_email, site_url,
             json.dumps(money_keywords), conversion_rate, avg_job_value,
             brevo_template_id, gsc_property, ga_property_id,
             1 if active else 0),
        )
        await db.commit()
        async with db.execute(
            "SELECT id FROM reporting_clients WHERE slug = ?", (slug,)
        ) as cur:
            row = await cur.fetchone()
            return row[0] if row else 0


async def log_send(
    client_id: int,
    slug: str,
    week_of: str,
    status: str,
    error: Optional[str] = None,
    email_subject: Optional[str] = None,
    email_preview: Optional[str] = None,
    data_snapshot: Optional[dict] = None,
) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """INSERT INTO reporting_sends
               (client_id, slug, week_of, status, error, email_subject,
                email_preview, data_snapshot_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (client_id, slug, week_of, status, error,
             email_subject, (email_preview or "")[:500],
             json.dumps(data_snapshot or {})[:8000]),
        )
        await db.commit()
        return cur.lastrowid or 0


async def get_recent_sends(slug: Optional[str] = None, limit: int = 50) -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        q = "SELECT id, slug, week_of, status, error, email_subject, email_preview, sent_at FROM reporting_sends"
        params: tuple = ()
        if slug:
            q += " WHERE slug = ?"
            params = (slug,)
        q += " ORDER BY sent_at DESC LIMIT ?"
        params = params + (limit,)
        async with db.execute(q, params) as cur:
            return [dict(r) for r in await cur.fetchall()]
