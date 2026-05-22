"""
Lola SEO — SQLite-backed cache for outbound Google API calls.

Each cached entry stores a JSON blob keyed by sha256(api_name + sorted params).
Per-API TTLs (defaults):

    pagespeed     24h
    places         7d
    safebrowsing  24h
    custom_search 24h

Cache hits are FREE quota-wise. Once your real Google keys are in place, a
typical re-audit-of-the-same-business within 24 hours costs $0 in Google fees.
"""

import hashlib
import json
import os
from datetime import datetime, timedelta
from typing import Any, Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")


DEFAULT_TTL = {
    "pagespeed": timedelta(hours=24),
    "places": timedelta(days=7),
    "safebrowsing": timedelta(hours=24),
    "custom_search": timedelta(hours=24),
}


CREATE_CACHE = """
CREATE TABLE IF NOT EXISTS api_cache (
    cache_key TEXT PRIMARY KEY,
    api TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);
"""

CREATE_INDEX = """
CREATE INDEX IF NOT EXISTS idx_cache_expires ON api_cache(expires_at);
"""


async def init_cache_table():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_CACHE)
        await db.execute(CREATE_INDEX)
        await db.commit()
    print(f"✅ API cache table ready at {DB_PATH}")


def make_cache_key(api: str, params: dict) -> str:
    """Deterministic SHA256 hash of api+sorted-params for stable cache lookups."""
    raw = f"{api}:{json.dumps(params, sort_keys=True, default=str)}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def cache_get(api: str, params: dict) -> Optional[dict]:
    key = make_cache_key(api, params)
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT data, expires_at FROM api_cache WHERE cache_key = ?",
            (key,),
        ) as cur:
            row = await cur.fetchone()
    if not row:
        return None
    data_str, expires_at_str = row
    try:
        expires_at = datetime.fromisoformat(expires_at_str)
    except (TypeError, ValueError):
        return None
    if expires_at < datetime.utcnow():
        return None
    try:
        return json.loads(data_str)
    except (TypeError, ValueError):
        return None


async def cache_set(api: str, params: dict, data: dict, ttl: Optional[timedelta] = None):
    if ttl is None:
        ttl = DEFAULT_TTL.get(api, timedelta(hours=24))
    key = make_cache_key(api, params)
    expires_at = (datetime.utcnow() + ttl).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO api_cache (cache_key, api, data, expires_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(cache_key) DO UPDATE SET
              data = excluded.data,
              expires_at = excluded.expires_at,
              created_at = datetime('now')
            """,
            (key, api, json.dumps(data, default=str), expires_at),
        )
        await db.commit()


async def cache_stats() -> dict:
    """Quick observability — how many cache entries per API, plus hit potential."""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT api, COUNT(*) FROM api_cache WHERE expires_at > datetime('now') GROUP BY api"
        ) as cur:
            rows = await cur.fetchall()
    return {api: count for api, count in rows}


async def cache_purge_expired():
    """Housekeeping — drop expired entries. Safe to run on startup."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM api_cache WHERE expires_at < datetime('now')")
        await db.commit()


async def audits_today_count() -> int:
    """Per-day audit count, used by the AUDIT_DAILY_LIMIT guardrail."""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*) FROM audits WHERE date(created_at) = date('now')"
        ) as cur:
            row = await cur.fetchone()
    return int(row[0]) if row else 0
