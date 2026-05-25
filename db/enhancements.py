"""
SQLite cache for AI-generated audit enhancements.

One row per audit_id. JSON blob holds the structured enhancement payload.
Cached so re-loading the report page doesn't re-spend Claude tokens.
"""

import json
import os
from typing import Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

CREATE = """
CREATE TABLE IF NOT EXISTS audit_enhancements (
    audit_id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',  -- 'ready' | 'error'
    error TEXT,
    model TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
);
"""

CREATE_IDX = """
CREATE INDEX IF NOT EXISTS idx_enhancements_status ON audit_enhancements(status);
"""


async def init_enhancements_table() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE)
        for stmt in CREATE_IDX.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.commit()
    print(f"✅ Audit enhancements table ready at {DB_PATH}")


async def get_enhancement(audit_id: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT audit_id, payload_json, status, error, model, created_at, updated_at "
            "FROM audit_enhancements WHERE audit_id = ?",
            (audit_id,),
        ) as cur:
            row = await cur.fetchone()
            if not row:
                return None
            d = dict(row)
            try:
                d["payload"] = json.loads(d.pop("payload_json") or "{}")
            except Exception:
                d["payload"] = {}
            return d


async def save_enhancement(
    audit_id: str,
    payload: dict,
    status: str = "ready",
    error: Optional[str] = None,
    model: Optional[str] = None,
) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO audit_enhancements (audit_id, payload_json, status, error, model, updated_at)
               VALUES (?, ?, ?, ?, ?, datetime('now'))
               ON CONFLICT(audit_id) DO UPDATE SET
                 payload_json = excluded.payload_json,
                 status = excluded.status,
                 error = excluded.error,
                 model = excluded.model,
                 updated_at = datetime('now')""",
            (audit_id, json.dumps(payload), status, error, model),
        )
        await db.commit()
