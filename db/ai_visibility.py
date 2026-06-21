"""
AI Visibility snapshots — tracks whether each client is cited in AI search engines.

One row per (slug, engine, query, snapshot_date). The AI Visibility Index
(0–100) is computed from share-of-citation across engines and queries.
"""

import os
import json
from typing import Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

CREATE_SNAPSHOTS = """
CREATE TABLE IF NOT EXISTS ai_visibility_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    engine TEXT NOT NULL,         -- chatgpt | perplexity | google_aio | claude_proxy
    query TEXT NOT NULL,
    cited INTEGER NOT NULL DEFAULT 0,   -- 0 or 1
    cited_url TEXT,
    position_in_response INTEGER,       -- rough position if cited (1=first mention)
    response_excerpt TEXT,              -- first 300 chars of engine response
    snapshot_date TEXT NOT NULL,        -- ISO date YYYY-MM-DD
    created_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_IDX = """
CREATE INDEX IF NOT EXISTS idx_aiv_slug ON ai_visibility_snapshots(slug, snapshot_date DESC);
"""

CREATE_INDEX_TABLE = """
CREATE TABLE IF NOT EXISTS ai_visibility_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    index_score REAL NOT NULL DEFAULT 0,    -- 0–100
    engines_checked INTEGER NOT NULL DEFAULT 0,
    queries_checked INTEGER NOT NULL DEFAULT 0,
    citations_found INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
"""

CREATE_IDX2 = """
CREATE INDEX IF NOT EXISTS idx_aiv_index_slug ON ai_visibility_index(slug, snapshot_date DESC);
"""


async def init_ai_visibility_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_SNAPSHOTS)
        await db.execute(CREATE_IDX)
        await db.execute(CREATE_INDEX_TABLE)
        await db.execute(CREATE_IDX2)
        await db.commit()


async def save_check(slug: str, check: dict) -> int:
    from datetime import date as _date
    today = _date.today().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """INSERT OR REPLACE INTO ai_visibility_snapshots
               (slug, engine, query, cited, cited_url, position_in_response,
                response_excerpt, snapshot_date)
               VALUES (?,?,?,?,?,?,?,?)""",
            (
                slug.strip().lower(),
                check.get("engine", ""),
                check.get("query", ""),
                1 if check.get("cited") else 0,
                check.get("cited_url"),
                check.get("position_in_response"),
                (check.get("response_excerpt") or "")[:300],
                check.get("snapshot_date", today),
            ),
        )
        await db.commit()
        return cur.lastrowid


async def save_index(slug: str, data: dict) -> None:
    from datetime import date as _date
    today = _date.today().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO ai_visibility_index
               (slug, snapshot_date, index_score, engines_checked, queries_checked, citations_found)
               VALUES (?,?,?,?,?,?)""",
            (
                slug.strip().lower(),
                today,
                float(data.get("index_score", 0)),
                int(data.get("engines_checked", 0)),
                int(data.get("queries_checked", 0)),
                int(data.get("citations_found", 0)),
            ),
        )
        await db.commit()


async def get_latest_index(slug: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT * FROM ai_visibility_index WHERE slug=?
               ORDER BY snapshot_date DESC LIMIT 1""",
            (slug.strip().lower(),),
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def get_latest_checks(slug: str) -> list:
    """Get most recent check per (engine, query)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT s.* FROM ai_visibility_snapshots s
               INNER JOIN (
                   SELECT engine, query, MAX(snapshot_date) AS mx
                   FROM ai_visibility_snapshots WHERE slug=? GROUP BY engine, query
               ) latest ON s.engine=latest.engine AND s.query=latest.query
                         AND s.snapshot_date=latest.mx AND s.slug=?
               ORDER BY s.engine, s.query""",
            (slug.strip().lower(), slug.strip().lower()),
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def get_trend(slug: str, limit: int = 4) -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT snapshot_date, index_score, engines_checked, citations_found
               FROM ai_visibility_index WHERE slug=?
               ORDER BY snapshot_date DESC LIMIT ?""",
            (slug.strip().lower(), limit),
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]
