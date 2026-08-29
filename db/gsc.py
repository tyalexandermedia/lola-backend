"""
Lola — SQLite cache for Google Search Console pulls.

GSC's quota is real and audits will hammer it, so every /queries and /pages read
is served from gsc_snapshots. We only hit the Google API on a cache miss or an
explicit refresh.

Snapshots are unique on (client_id, dimension, date_range_end). Because default
ranges always end GSC_LAG_DAYS ago, that end date is stable within a day: the
first pull of the day fills the cache, the rest of the day is free, and a new day
naturally rolls the key forward and re-pulls once.

The `clients` table in this repo is `reporting_clients`; it already carries
`gsc_property`. _ensure_gsc_property_column() defensively adds the column to
older databases whose table predates it (CREATE TABLE IF NOT EXISTS never alters
an existing table).
"""

import json
import os
from typing import Any, Dict, List, Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")


CREATE_SNAPSHOTS = """
CREATE TABLE IF NOT EXISTS gsc_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    captured_at TEXT NOT NULL DEFAULT (datetime('now')),
    date_range_start TEXT NOT NULL,
    date_range_end TEXT NOT NULL,
    dimension TEXT NOT NULL,
    payload TEXT NOT NULL,
    UNIQUE(client_id, dimension, date_range_end)
);
"""

CREATE_IDX = (
    "CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_client_dim "
    "ON gsc_snapshots(client_id, dimension, date_range_end DESC);"
)


async def _ensure_gsc_property_column() -> None:
    """Add reporting_clients.gsc_property on older DBs that predate it. No-op if
    the table doesn't exist yet or the column is already present."""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("PRAGMA table_info(reporting_clients)") as cur:
            cols = [r[1] for r in await cur.fetchall()]
        if cols and "gsc_property" not in cols:
            await db.execute("ALTER TABLE reporting_clients ADD COLUMN gsc_property TEXT")
            await db.commit()


async def init_gsc_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_SNAPSHOTS)
        await db.execute(CREATE_IDX)
        await db.commit()
    await _ensure_gsc_property_column()
    print(f"✅ GSC snapshots table ready at {DB_PATH}")


def _hydrate(row: aiosqlite.Row) -> Dict[str, Any]:
    d = dict(row)
    try:
        d["payload"] = json.loads(d["payload"])
    except (TypeError, ValueError):
        d["payload"] = None
    return d


async def get_snapshot(client_id: int, dimension: str, date_range_end: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM gsc_snapshots WHERE client_id=? AND dimension=? AND date_range_end=?",
            (client_id, dimension, date_range_end),
        ) as cur:
            row = await cur.fetchone()
    return _hydrate(row) if row else None


async def save_snapshot(
    client_id: int,
    dimension: str,
    date_range_start: str,
    date_range_end: str,
    payload: Dict[str, Any],
) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO gsc_snapshots
              (client_id, captured_at, date_range_start, date_range_end, dimension, payload)
            VALUES (?, datetime('now'), ?, ?, ?, ?)
            ON CONFLICT(client_id, dimension, date_range_end) DO UPDATE SET
              captured_at = datetime('now'),
              date_range_start = excluded.date_range_start,
              payload = excluded.payload
            """,
            (client_id, date_range_start, date_range_end, dimension, json.dumps(payload, default=str)),
        )
        await db.commit()


async def latest_snapshot(client_id: int, dimension: Optional[str] = None) -> Optional[Dict[str, Any]]:
    q = "SELECT * FROM gsc_snapshots WHERE client_id=?"
    args: List[Any] = [client_id]
    if dimension:
        q += " AND dimension=?"
        args.append(dimension)
    q += " ORDER BY captured_at DESC LIMIT 1"
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(q, tuple(args)) as cur:
            row = await cur.fetchone()
    return _hydrate(row) if row else None


async def delete_snapshots(client_id: int, dimension: Optional[str] = None) -> None:
    """Bust the cache for a client (all dimensions, or one). Used by /refresh."""
    q = "DELETE FROM gsc_snapshots WHERE client_id=?"
    args: List[Any] = [client_id]
    if dimension:
        q += " AND dimension=?"
        args.append(dimension)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(q, tuple(args))
        await db.commit()
