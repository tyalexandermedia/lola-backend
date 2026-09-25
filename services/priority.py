"""
Lola priority engine — deterministic, explainable ranking for the Daily Brief.

The whole point of Lola: given everything, what's the most important thing to do
next? This module answers it with plain Python and returns a *reason in
English*, not a bare score (see docs/LOLA-COMMAND-CENTER-AUDIT.md §15).

Two behavioral rules are baked in:
  1. Revenue/customer action outranks speculative build — unless the build fixes
     a broken revenue-critical system or is unblocking revenue work.
  2. A broken revenue-critical system (system_critical) overrides everything.

The numbers here are intentionally round heuristics, tuned from real use, not a
false-precision model. An internal score orders the list; the UI shows the why.
"""

from datetime import datetime, timezone
from typing import Optional

from db.lola_items import list_open_items, list_recent_completed, scoreboard_summary

# Effort tie-breakers (quick wins edge ahead when value is comparable).
_EFFORT_ADJ = {"small": 6.0, "medium": 0.0, "large": -8.0}
_EFFORT_WORDS = {"small": "quick", "medium": "", "large": "bigger lift"}

# Workspaces whose non-revenue work is "speculative build" and gets discounted
# unless it's system-critical or unblocking.
_BUILD_WORKSPACES = {"lola-dev"}


def _hours_since(iso: Optional[str]) -> float:
    if not iso:
        return 0.0
    try:
        dt = datetime.fromisoformat(iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max((datetime.now(timezone.utc) - dt).total_seconds() / 3600.0, 0.0)
    except Exception:
        return 0.0


def _overdue_hours(due_iso: Optional[str]) -> float:
    if not due_iso:
        return 0.0
    try:
        dt = datetime.fromisoformat(due_iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = (datetime.now(timezone.utc) - dt).total_seconds() / 3600.0
        return max(delta, 0.0)
    except Exception:
        return 0.0


def _money_phrase(amount: float, recurring: bool) -> str:
    if amount <= 0:
        return ""
    a = int(round(amount))
    return f"~${a:,}/mo potential" if recurring else f"~${a:,} on the table"


def score_item(item: dict) -> dict:
    """Return {score, reason, factors} for one item. Pure function."""
    # 0) System-critical override — a broken revenue system beats everything.
    if item.get("system_critical"):
        return {
            "score": 1000.0,
            "reason": "A revenue-critical system is broken — fix this before anything else.",
            "factors": {"override": "system_critical"},
        }

    amount = float(item.get("revenue_estimate") or 0)
    recurring = bool(item.get("revenue_recurring"))
    confidence = float(item.get("confidence") or 0.6)
    effort = item.get("effort") or "medium"
    itype = item.get("type") or "task"
    workspace = item.get("workspace") or ""
    waiting_on = (item.get("waiting_on") or "").strip()

    # 1) Revenue value — recurring dollars weighted toward the $/mo goal.
    if recurring:
        rev_pts = min(amount / 50.0, 40.0)      # $2,000/mo -> cap 40
    else:
        rev_pts = min(amount / 200.0, 25.0)     # $5,000 one-time -> cap 25
    rev_pts *= confidence                        # discount uncertain money

    # 2) Time pressure — someone waiting, or a due date passed.
    pressure_h = max(_hours_since(item.get("urgency_at")), _overdue_hours(item.get("due_at")))
    urg_pts = min(pressure_h / 2.0, 30.0)        # 48h waiting -> cap 30

    # 3) A real person is waiting on you.
    someone_waiting = itype == "opportunity" or bool(waiting_on) or itype == "waiting"
    customer_pts = 10.0 if someone_waiting else 0.0

    # 4) Effort tie-break.
    effort_pts = _EFFORT_ADJ.get(effort, 0.0)

    base = rev_pts + urg_pts + customer_pts + effort_pts

    # 5) Revenue-before-build: discount speculative build work.
    is_revenue = amount > 0 or itype == "opportunity"
    is_speculative_build = (
        workspace in _BUILD_WORKSPACES and not is_revenue and itype in ("idea", "task")
    )
    category_mult = 0.6 if is_speculative_build else 1.0
    score = round(base * category_mult, 2)

    # 6) Plain-language reason from the dominant factors.
    bits = []
    money = _money_phrase(amount, recurring)
    if money:
        bits.append(money)
    if pressure_h >= 1:
        if _overdue_hours(item.get("due_at")) >= 1 and not _hours_since(item.get("urgency_at")):
            days = int(pressure_h // 24)
            bits.append(f"{days}d overdue" if days >= 1 else f"{int(pressure_h)}h overdue")
        else:
            days = int(pressure_h // 24)
            bits.append(f"waiting {days}d" if days >= 1 else f"waiting {int(pressure_h)}h")
    if someone_waiting and not money:
        bits.append(f"{waiting_on or 'someone'} is waiting on you")
    ework = _EFFORT_WORDS.get(effort, "")
    if ework and score > 0:
        bits.append(ework)
    if is_speculative_build:
        bits.append("build work — parked behind revenue")

    reason = "; ".join(b for b in bits if b) or "No pressing signal — housekeeping."
    reason = reason[0].upper() + reason[1:] if reason else reason

    return {
        "score": score,
        "reason": reason,
        "factors": {
            "revenue_pts": round(rev_pts, 1),
            "urgency_pts": round(urg_pts, 1),
            "customer_pts": customer_pts,
            "effort_pts": effort_pts,
            "category_mult": category_mult,
        },
    }


def _decorate(items: list[dict]) -> list[dict]:
    out = []
    for it in items:
        s = score_item(it)
        out.append({**it, "priority_score": s["score"], "why": s["reason"], "factors": s["factors"]})
    out.sort(key=lambda x: x["priority_score"], reverse=True)
    return out


async def build_brief() -> dict:
    """
    Assemble the Daily Command Center. Sections are filtered views over the
    same scored items, so the top item also appears in its category — expected.
    """
    open_items = await list_open_items()
    scored = _decorate(open_items)

    most_important = scored[0] if scored else None

    # "Today" = explicitly-today items first, then the next best actionable ones.
    today_explicit = [i for i in scored if i["status"] == "today"]
    actionable = [
        i for i in scored
        if i["status"] in ("inbox", "today", "active") and i is not most_important
    ]
    seen = {id(i) for i in today_explicit}
    today = today_explicit + [i for i in actionable if id(i) not in seen]
    today = today[:5]

    revenue = [i for i in scored if (i.get("revenue_estimate") or 0) > 0 or i.get("type") == "opportunity"]
    waiting = [i for i in scored if i["status"] == "waiting" or (i.get("waiting_on") or "").strip()]
    active = [i for i in scored if i["status"] == "active"]
    inbox = [i for i in scored if i["status"] == "inbox"]

    completed = await list_recent_completed()
    scoreboard = await scoreboard_summary()

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "most_important_next_step": most_important,
        "today": today,
        "revenue_opportunities": revenue[:12],
        "waiting_blocked": waiting[:12],
        "active": active[:12],
        "inbox": inbox[:20],
        "completed": completed,
        "scoreboard": scoreboard,
        "counts": {
            "open": len(scored),
            "revenue": len(revenue),
            "waiting": len(waiting),
            "active": len(active),
            "inbox": len(inbox),
        },
    }
