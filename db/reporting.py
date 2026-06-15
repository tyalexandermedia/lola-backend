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
CREATE INDEX IF NOT EXISTS idx_reporting_tasks_slug ON reporting_tasks(slug, status);
"""

# Implementation tracker — the "here's the work we did" feed surfaced on the
# public client dashboard (and fed to the weekly email). One row per work item.
#   category: content | citation | review | gbp | fix | other
#   status:   done | in_progress | next_up
CREATE_TASKS = """
CREATE TABLE IF NOT EXISTS reporting_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    status TEXT NOT NULL DEFAULT 'done',
    detail TEXT,
    url TEXT,
    week_of TEXT,                         -- ISO date of the Monday this lands in
    created_at TEXT DEFAULT (datetime('now'))
);
"""

# Canonical vocab — kept here so the API layer can validate against one source.
TASK_CATEGORIES = ("content", "citation", "review", "gbp", "fix", "other")
TASK_STATUSES = ("done", "in_progress", "next_up")

# Additive migrations. SQLite has no IF NOT EXISTS for ADD COLUMN, so we
# try each and swallow the "duplicate column" OperationalError. These two
# columns let the case-study ranking tracker pull config from this same
# table — one source of truth for retainer clients instead of a hardcoded
# Python dict that needs a redeploy to add a client.
_ADD_COLUMNS = [
    "ALTER TABLE reporting_clients ADD COLUMN target_url TEXT",
    "ALTER TABLE reporting_clients ADD COLUMN ai_mode_prompts_json TEXT NOT NULL DEFAULT '[]'",
]


async def init_reporting_tables() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_CLIENTS)
        await db.execute(CREATE_SENDS)
        await db.execute(CREATE_TASKS)
        for stmt in CREATE_IDX.strip().split(";"):
            if stmt.strip():
                await db.execute(stmt)
        for stmt in _ADD_COLUMNS:
            try:
                await db.execute(stmt)
            except aiosqlite.OperationalError as e:
                if "duplicate column" not in str(e).lower():
                    raise
        await db.commit()
    print(f"✅ Reporting agent tables ready at {DB_PATH}")


def _hydrate_client_row(row: aiosqlite.Row) -> dict:
    d = dict(row)
    try:
        d["money_keywords"] = json.loads(d.pop("money_keywords_json") or "[]")
    except Exception:
        d["money_keywords"] = []
    try:
        d["ai_mode_prompts"] = json.loads(d.pop("ai_mode_prompts_json") or "[]")
    except Exception:
        d["ai_mode_prompts"] = []
    return d


async def get_active_clients() -> List[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM reporting_clients WHERE active = 1 ORDER BY slug"
        ) as cur:
            rows = await cur.fetchall()
            return [_hydrate_client_row(r) for r in rows]


async def get_client_by_slug(slug: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM reporting_clients WHERE slug = ?", (slug,)
        ) as cur:
            row = await cur.fetchone()
            if not row:
                return None
            return _hydrate_client_row(row)


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
    target_url: Optional[str] = None,
    ai_mode_prompts: Optional[List[str]] = None,
) -> int:
    """
    Upsert by slug. New optional args:
      target_url           — specific page being ranked (case-study tracker uses
                             this; defaults to site_url at lookup time if NULL).
      ai_mode_prompts      — prompts for the Claude AI Mode visibility check.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO reporting_clients
               (slug, client_name, client_email, site_url, money_keywords_json,
                conversion_rate, avg_job_value, brevo_template_id, gsc_property,
                ga_property_id, active, target_url, ai_mode_prompts_json, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
                 target_url = excluded.target_url,
                 ai_mode_prompts_json = excluded.ai_mode_prompts_json,
                 updated_at = datetime('now')""",
            (slug, client_name, client_email, site_url,
             json.dumps(money_keywords), conversion_rate, avg_job_value,
             brevo_template_id, gsc_property, ga_property_id,
             1 if active else 0,
             target_url,
             json.dumps(ai_mode_prompts or [])),
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


# ── Implementation tracker (work-delivered feed) ──────────────────


async def add_task(
    slug: str,
    title: str,
    category: str = "other",
    status: str = "done",
    detail: Optional[str] = None,
    url: Optional[str] = None,
    week_of: Optional[str] = None,
) -> int:
    """Log a single work item for a client. Returns the new row id."""
    if category not in TASK_CATEGORIES:
        category = "other"
    if status not in TASK_STATUSES:
        status = "done"
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """INSERT INTO reporting_tasks (slug, title, category, status, detail, url, week_of)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (slug, title.strip(), category, status, detail, url, week_of),
        )
        await db.commit()
        return cur.lastrowid or 0


async def delete_task(task_id: int) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("DELETE FROM reporting_tasks WHERE id = ?", (task_id,))
        await db.commit()
        return (cur.rowcount or 0) > 0


async def list_tasks_for_slug(slug: str, limit: int = 200) -> List[dict]:
    """All tasks for a client, newest first. Admin view (includes id)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT id, slug, title, category, status, detail, url, week_of, created_at
               FROM reporting_tasks WHERE slug = ?
               ORDER BY created_at DESC LIMIT ?""",
            (slug, limit),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def get_tasks_grouped(slug: str) -> dict:
    """
    Tasks bucketed by status for the public dashboard + weekly email.
    Returns done / in_progress / next_up lists (safe fields only) plus
    per-category counts of completed work.
    """
    rows = await list_tasks_for_slug(slug, limit=500)
    done: List[dict] = []
    in_progress: List[dict] = []
    next_up: List[dict] = []
    counts = {c: 0 for c in TASK_CATEGORIES}
    for r in rows:
        item = {
            "title": r["title"],
            "category": r["category"],
            "detail": r["detail"],
            "url": r["url"],
            "week_of": r["week_of"],
            "created_at": r["created_at"],
        }
        if r["status"] == "done":
            done.append(item)
            counts[r["category"]] = counts.get(r["category"], 0) + 1
        elif r["status"] == "in_progress":
            in_progress.append(item)
        elif r["status"] == "next_up":
            next_up.append(item)
    return {
        "done": done,
        "in_progress": in_progress,
        "next_up": next_up,
        "counts": counts,
        "total_done": len(done),
    }
