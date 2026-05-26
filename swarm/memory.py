"""
Swarm pattern memory — SQLite-backed.

Why SQLite over local JSON: Railway's filesystem is ephemeral and a JSON file
on disk would be wiped on every redeploy, losing all learned patterns.
SQLite at lola.db is the existing persistence pattern in this repo.
"""

from __future__ import annotations

import json
import os
from typing import List, Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

CREATE = """
CREATE TABLE IF NOT EXISTS swarm_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT NOT NULL,
    pattern_data TEXT NOT NULL,
    success_count INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_swarm_patterns_type ON swarm_patterns(pattern_type);

CREATE TABLE IF NOT EXISTS swarm_workflows (
    workflow_id TEXT PRIMARY KEY,
    business_url TEXT,
    status TEXT,
    payload_json TEXT NOT NULL,
    execution_time_seconds REAL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_swarm_workflows_created ON swarm_workflows(created_at DESC);
"""


async def init_swarm_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        for stmt in CREATE.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.commit()
    print(f"[swarm] memory tables ready at {DB_PATH}")


async def store_pattern(pattern_type: str, pattern_data: dict) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            "INSERT INTO swarm_patterns (pattern_type, pattern_data, updated_at) "
            "VALUES (?, ?, datetime('now'))",
            (pattern_type, json.dumps(pattern_data)),
        )
        await db.commit()
        return cur.lastrowid or 0


async def get_patterns(pattern_type: Optional[str] = None, limit: int = 100) -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if pattern_type:
            cur = await db.execute(
                "SELECT id, pattern_type, pattern_data, success_count, created_at "
                "FROM swarm_patterns WHERE pattern_type = ? "
                "ORDER BY success_count DESC, created_at DESC LIMIT ?",
                (pattern_type, limit),
            )
        else:
            cur = await db.execute(
                "SELECT id, pattern_type, pattern_data, success_count, created_at "
                "FROM swarm_patterns "
                "ORDER BY success_count DESC, created_at DESC LIMIT ?",
                (limit,),
            )
        rows = await cur.fetchall()
    out: List[dict] = []
    for row in rows:
        d = dict(row)
        try:
            d["data"] = json.loads(d.pop("pattern_data") or "{}")
        except Exception:
            d["data"] = {}
        out.append(d)
    return out


async def increment_success(pattern_id: int) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE swarm_patterns SET success_count = success_count + 1, "
            "updated_at = datetime('now') WHERE id = ?",
            (pattern_id,),
        )
        await db.commit()


async def save_workflow(
    workflow_id: str,
    business_url: str,
    status: str,
    payload: dict,
    execution_time_seconds: float,
) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO swarm_workflows "
            "(workflow_id, business_url, status, payload_json, execution_time_seconds) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(workflow_id) DO UPDATE SET "
            "  status=excluded.status, payload_json=excluded.payload_json, "
            "  execution_time_seconds=excluded.execution_time_seconds",
            (workflow_id, business_url, status, json.dumps(payload), execution_time_seconds),
        )
        await db.commit()


async def list_workflows(limit: int = 50) -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT workflow_id, business_url, status, execution_time_seconds, created_at "
            "FROM swarm_workflows ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]
