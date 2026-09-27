"""
Lola personal command-center store — the ONE general table the Daily Brief
reads and writes, plus a lightweight monthly-revenue scoreboard.

This is the personal-OS layer that sits *above* the Lola Leads product tables.
It is deliberately separate (its own tables, a `workspace` dimension) so it can
be split into its own app later without untangling product code — see
docs/LOLA-COMMAND-CENTER-AUDIT.md §13/§21.

Design rules honored here:
  - One general `lola_items` table, not a fourth task system. Product-side
    signals (hot leads, stale estimates, revenue actions, GHL opportunities)
    are *mirrored in* as rows with source != 'manual', so the priority engine
    has a single thing to rank.
  - No FKs, string-key convention, aiosqlite per-call — matches the codebase.
  - Idempotent external ingestion via a UNIQUE(source, source_ref) partial
    index, so re-running the refresh never duplicates a mirrored row.
"""

import os
from datetime import datetime, timezone
from typing import Optional

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "lola.db")

# The six workspaces Lola spans. A lightweight tag, NOT a tenant system.
WORKSPACES = [
    "sandbar",
    "lola-leads",
    "coach-ty",
    "ty-alexander-media",
    "lola-dev",
    "personal",
]
WORKSPACE_LABELS = {
    "sandbar": "Sandbar Soft Wash",
    "lola-leads": "Lola Leads",
    "coach-ty": "Coach Ty",
    "ty-alexander-media": "Ty Alexander Media",
    "lola-dev": "Lola Dev",
    "personal": "Personal / Admin",
}

# Item lifecycle. Sections in the brief are just filtered views over these.
STATUSES = {"inbox", "today", "active", "waiting", "done", "ignored"}
TYPES = {"task", "idea", "opportunity", "waiting", "active", "note"}
EFFORTS = {"small", "medium", "large"}

# The predictable-monthly-revenue target that drives the scoreboard + gap.
REVENUE_TARGET = float(os.getenv("LOLA_REVENUE_TARGET", "4000"))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def valid_workspace(w: str) -> bool:
    return w in WORKSPACES


CREATE_ITEMS = """
CREATE TABLE IF NOT EXISTS lola_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'task',
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'inbox',
    source TEXT NOT NULL DEFAULT 'manual',
    source_ref TEXT NOT NULL DEFAULT '',
    revenue_estimate REAL NOT NULL DEFAULT 0,
    revenue_recurring INTEGER NOT NULL DEFAULT 0,
    effort TEXT NOT NULL DEFAULT 'medium',
    confidence REAL NOT NULL DEFAULT 0.6,
    urgency_at TEXT,
    due_at TEXT,
    waiting_on TEXT NOT NULL DEFAULT '',
    system_critical INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
);
"""

# Partial unique index: external rows dedupe on (source, source_ref); manual
# rows (empty source_ref) are exempt so many can coexist.
CREATE_ITEMS_IDX = """
CREATE UNIQUE INDEX IF NOT EXISTS idx_lola_items_source
ON lola_items(source, source_ref)
WHERE source_ref != '';
"""

CREATE_SCOREBOARD = """
CREATE TABLE IF NOT EXISTS lola_scoreboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace TEXT NOT NULL,
    period TEXT NOT NULL,          -- 'YYYY-MM'
    amount REAL NOT NULL DEFAULT 0, -- predictable monthly revenue for that business
    note TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);
"""
CREATE_SCOREBOARD_IDX = """
CREATE UNIQUE INDEX IF NOT EXISTS idx_lola_scoreboard_wp
ON lola_scoreboard(workspace, period);
"""


async def init_lola_items_table() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_ITEMS)
        await db.execute(CREATE_ITEMS_IDX)
        await db.execute(CREATE_SCOREBOARD)
        await db.execute(CREATE_SCOREBOARD_IDX)
        await db.commit()
    print(f"✅ Lola command-center tables ready at {DB_PATH}")


def _hydrate(row: aiosqlite.Row) -> dict:
    d = dict(row)
    d["revenue_recurring"] = bool(d.get("revenue_recurring"))
    d["system_critical"] = bool(d.get("system_critical"))
    d["workspace_label"] = WORKSPACE_LABELS.get(d.get("workspace", ""), d.get("workspace", ""))
    return d


async def create_item(
    *,
    workspace: str,
    title: str,
    detail: str = "",
    type: str = "task",
    status: str = "inbox",
    source: str = "manual",
    source_ref: str = "",
    revenue_estimate: float = 0,
    revenue_recurring: bool = False,
    effort: str = "medium",
    confidence: float = 0.6,
    urgency_at: Optional[str] = None,
    due_at: Optional[str] = None,
    waiting_on: str = "",
    system_critical: bool = False,
) -> dict:
    if not valid_workspace(workspace):
        raise ValueError(f"unknown workspace: {workspace}")
    if type not in TYPES:
        type = "task"
    if status not in STATUSES:
        status = "inbox"
    if effort not in EFFORTS:
        effort = "medium"
    now = _now()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            """
            INSERT INTO lola_items
              (workspace, type, title, detail, status, source, source_ref,
               revenue_estimate, revenue_recurring, effort, confidence,
               urgency_at, due_at, waiting_on, system_critical,
               created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                workspace, type, title, detail, status, source, source_ref,
                float(revenue_estimate or 0), 1 if revenue_recurring else 0,
                effort, float(confidence if confidence is not None else 0.6),
                urgency_at, due_at, waiting_on, 1 if system_critical else 0,
                now, now,
            ),
        )
        await db.commit()
        row = await (await db.execute("SELECT * FROM lola_items WHERE id=?", (cur.lastrowid,))).fetchone()
    return _hydrate(row)


async def upsert_external(
    *,
    source: str,
    source_ref: str,
    workspace: str,
    title: str,
    type: str = "opportunity",
    detail: str = "",
    revenue_estimate: float = 0,
    revenue_recurring: bool = False,
    effort: str = "medium",
    confidence: float = 0.6,
    urgency_at: Optional[str] = None,
    due_at: Optional[str] = None,
    waiting_on: str = "",
    system_critical: bool = False,
) -> str:
    """
    Insert or update a mirrored external row, keyed by (source, source_ref).
    Never clobbers a human status change: if the row exists and its status is
    'done' or 'ignored', it's left alone. Returns 'created' | 'updated' | 'skipped'.
    """
    if not valid_workspace(workspace):
        raise ValueError(f"unknown workspace: {workspace}")
    if not source_ref:
        raise ValueError("upsert_external requires a source_ref")
    now = _now()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        existing = await (
            await db.execute(
                "SELECT id, status FROM lola_items WHERE source=? AND source_ref=?",
                (source, source_ref),
            )
        ).fetchone()
        if existing:
            if existing["status"] in ("done", "ignored"):
                return "skipped"
            await db.execute(
                """
                UPDATE lola_items SET
                  workspace=?, type=?, title=?, detail=?,
                  revenue_estimate=?, revenue_recurring=?, effort=?, confidence=?,
                  urgency_at=COALESCE(urgency_at, ?), due_at=?, waiting_on=?,
                  system_critical=?, updated_at=?
                WHERE id=?
                """,
                (
                    workspace, type, title, detail,
                    float(revenue_estimate or 0), 1 if revenue_recurring else 0,
                    effort, float(confidence if confidence is not None else 0.6),
                    urgency_at, due_at, waiting_on, 1 if system_critical else 0,
                    now, existing["id"],
                ),
            )
            await db.commit()
            return "updated"
        await db.execute(
            """
            INSERT INTO lola_items
              (workspace, type, title, detail, status, source, source_ref,
               revenue_estimate, revenue_recurring, effort, confidence,
               urgency_at, due_at, waiting_on, system_critical,
               created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                workspace, type, title, detail, "inbox", source, source_ref,
                float(revenue_estimate or 0), 1 if revenue_recurring else 0,
                effort, float(confidence if confidence is not None else 0.6),
                urgency_at, due_at, waiting_on, 1 if system_critical else 0,
                now, now,
            ),
        )
        await db.commit()
        return "created"


async def list_open_items(limit: int = 500) -> list[dict]:
    """Everything the brief might rank — not done, not ignored."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        rows = await (
            await db.execute(
                "SELECT * FROM lola_items WHERE status NOT IN ('done','ignored') "
                "ORDER BY created_at DESC LIMIT ?",
                (limit,),
            )
        ).fetchall()
    return [_hydrate(r) for r in rows]


async def list_recent_completed(limit: int = 12) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        rows = await (
            await db.execute(
                "SELECT * FROM lola_items WHERE status='done' "
                "ORDER BY completed_at DESC LIMIT ?",
                (limit,),
            )
        ).fetchall()
    return [_hydrate(r) for r in rows]


async def set_status(item_id: int, status: str) -> Optional[dict]:
    if status not in STATUSES:
        raise ValueError(f"unknown status: {status}")
    now = _now()
    completed = now if status == "done" else None
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute(
            "UPDATE lola_items SET status=?, updated_at=?, "
            "completed_at=CASE WHEN ?='done' THEN ? ELSE completed_at END WHERE id=?",
            (status, now, status, completed, item_id),
        )
        await db.commit()
        row = await (await db.execute("SELECT * FROM lola_items WHERE id=?", (item_id,))).fetchone()
    return _hydrate(row) if row else None


# ---- scoreboard -----------------------------------------------------------

async def set_scoreboard(workspace: str, period: str, amount: float, note: str = "") -> dict:
    if not valid_workspace(workspace):
        raise ValueError(f"unknown workspace: {workspace}")
    now = _now()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute(
            """
            INSERT INTO lola_scoreboard (workspace, period, amount, note, updated_at)
            VALUES (?,?,?,?,?)
            ON CONFLICT(workspace, period)
            DO UPDATE SET amount=excluded.amount, note=excluded.note, updated_at=excluded.updated_at
            """,
            (workspace, period, float(amount or 0), note, now),
        )
        await db.commit()
        row = await (
            await db.execute(
                "SELECT * FROM lola_scoreboard WHERE workspace=? AND period=?",
                (workspace, period),
            )
        ).fetchone()
    return dict(row)


async def scoreboard_summary() -> dict:
    """
    Predictable monthly revenue = the latest recorded amount per workspace,
    summed. Returns total, per-workspace latest, target, and gap.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        rows = await (
            await db.execute(
                """
                SELECT s.workspace, s.period, s.amount, s.note, s.updated_at
                FROM lola_scoreboard s
                JOIN (
                    SELECT workspace, MAX(period) AS mp
                    FROM lola_scoreboard GROUP BY workspace
                ) latest ON latest.workspace = s.workspace AND latest.mp = s.period
                """
            )
        ).fetchall()
    per = [
        {
            "workspace": r["workspace"],
            "label": WORKSPACE_LABELS.get(r["workspace"], r["workspace"]),
            "period": r["period"],
            "amount": r["amount"],
            "note": r["note"],
        }
        for r in rows
    ]
    total = round(sum(p["amount"] for p in per), 2)
    return {
        "total_monthly": total,
        "target": REVENUE_TARGET,
        "gap": round(max(REVENUE_TARGET - total, 0), 2),
        "pct_to_target": round(min(total / REVENUE_TARGET, 1) * 100) if REVENUE_TARGET else 0,
        "by_workspace": sorted(per, key=lambda p: -p["amount"]),
    }
