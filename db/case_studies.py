"""
Time-series ranking storage for client case studies.

One row per (case_study_slug, query, run_at). Lets us track ranking deltas
across runs (day-0 baseline → day-30 → day-60 → forever).

`source` differentiates Google organic rank (1..N) from AI Mode mentions
(boolean-as-int: 1 = mentioned, 0 = not). All numeric so dashboards stay
simple.
"""

import os
import aiosqlite
from datetime import datetime
from typing import List, Optional

DB_PATH = os.getenv("DB_PATH", "lola.db")

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS case_study_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    query TEXT NOT NULL,
    source TEXT NOT NULL,             -- 'google_organic' | 'claude_ai_mode'
    position INTEGER,                  -- 1..N for organic; NULL if not in top 10
    mentioned INTEGER DEFAULT 0,       -- 1 if domain mentioned in AI answer
    found_url TEXT,                    -- the URL that ranked (sanity check)
    raw_excerpt TEXT,                  -- short text snippet for human eyeball
    run_at TEXT DEFAULT (datetime('now')),
    notes TEXT
);
"""

CREATE_IDX = """
CREATE INDEX IF NOT EXISTS idx_cs_slug_run ON case_study_rankings(slug, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_cs_query ON case_study_rankings(query);
"""


async def init_case_studies_table() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_TABLE)
        for stmt in CREATE_IDX.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        await db.commit()
    print(f"✅ Case studies table ready at {DB_PATH}")


async def save_ranking(
    slug: str,
    query: str,
    source: str,
    position: Optional[int],
    mentioned: bool,
    found_url: str = "",
    raw_excerpt: str = "",
    notes: str = "",
) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """INSERT INTO case_study_rankings
               (slug, query, source, position, mentioned, found_url, raw_excerpt, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (slug, query, source, position, 1 if mentioned else 0,
             found_url, raw_excerpt[:500], notes),
        )
        await db.commit()
        return cur.lastrowid or 0


async def get_latest_run(slug: str) -> List[dict]:
    """Returns the most recent ranking row per (query, source) for a given slug."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT * FROM case_study_rankings
               WHERE slug = ?
               AND id IN (
                 SELECT MAX(id) FROM case_study_rankings
                 WHERE slug = ?
                 GROUP BY query, source
               )
               ORDER BY query, source""",
            (slug, slug),
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


async def get_run_history(slug: str, query: str, source: str, limit: int = 20) -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT id, position, mentioned, run_at, found_url, raw_excerpt
               FROM case_study_rankings
               WHERE slug = ? AND query = ? AND source = ?
               ORDER BY run_at DESC
               LIMIT ?""",
            (slug, query, source, limit),
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


async def get_all_history_for_slug(
    slug: str,
    max_rows_per_series: int = 30,
) -> List[dict]:
    """
    Full time-series for a slug — every (query, source) tuple's last N
    snapshots, oldest-first per series. Powers the public client dashboard.
    Excludes raw_excerpt + found_url from the public read (kept in DB for
    internal debugging) so we don't accidentally surface competitor copy
    or odd URLs on the client-facing page.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT query, source, position, mentioned, run_at
               FROM case_study_rankings
               WHERE slug = ?
               ORDER BY query, source, run_at ASC""",
            (slug,),
        ) as cur:
            rows = await cur.fetchall()

    series: dict[tuple[str, str], list[dict]] = {}
    for r in rows:
        key = (r["query"], r["source"])
        series.setdefault(key, []).append(
            {
                "position": r["position"],
                "mentioned": bool(r["mentioned"]),
                "run_at": r["run_at"],
            }
        )

    out: list[dict] = []
    for (query, source), points in series.items():
        trimmed = points[-max_rows_per_series:]
        latest = trimmed[-1] if trimmed else {}
        out.append({
            "query": query,
            "source": source,
            "current": latest,
            "history": trimmed,
            "run_count": len(trimmed),
        })
    out.sort(key=lambda s: (s["source"], s["query"]))
    return out
