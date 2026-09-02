"""
Tests for the Growth Timeline (growth/service.py).

Mocks the GSC client — no real credentials, no network — and runs the async
paths against a throwaway SQLite file. Covers the things that actually break:

  1. weekly bucketing math (boundaries, out-of-window dates dropped)
  2. a week with leads but no GSC data, and GSC data but no leads
  3. empty-everything returns has_gsc/has_leads=false, not a crash
  4. the query-movers diff between an earliest and a latest snapshot

Run:  python3 test_growth.py

DB_PATH is pointed at a temp file BEFORE the db modules are imported, because
each reads it at import time.
"""

import os
import tempfile
from datetime import date, timedelta

# ── Isolate the database + admin key before importing anything that reads them.
_TMP = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_TMP.close()
os.environ["DB_PATH"] = _TMP.name
os.environ.pop("GSC_SERVICE_ACCOUNT_JSON", None)  # start "not connected"
os.environ["LOLA_SECRET_ADMIN_KEY"] = "test-key"

import asyncio  # noqa: E402

import aiosqlite  # noqa: E402

import api_clients.gsc as gsc  # noqa: E402
from db.gsc import init_gsc_tables, save_snapshot  # noqa: E402
from db.reporting import add_task, init_reporting_tables, upsert_client  # noqa: E402
from db.tracking import init_tracking_tables  # noqa: E402
from growth import service  # noqa: E402


# ── Tiny test runner (same shape as test_gsc.py) ────────────────────────────

_failures = []


def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"{status}  {name}" + (f"  ({detail})" if detail else ""))
    if not cond:
        _failures.append(name)


# ── 1. Bucketing math (pure) ────────────────────────────────────────────────

def test_week_buckets():
    start = date(2026, 1, 5)  # a Monday
    buckets = service.week_buckets(start, 4)
    check("week_buckets returns `weeks` buckets", len(buckets) == 4, f"got {len(buckets)}")
    check("first bucket starts at start_date", buckets[0][0] == date(2026, 1, 5))
    check("first bucket ends 6 days later (inclusive)", buckets[0][1] == date(2026, 1, 11))
    check("buckets are contiguous", buckets[1][0] == date(2026, 1, 12))
    check("last bucket ends at start + weeks*7 - 1", buckets[-1][1] == date(2026, 2, 1))


def test_week_index():
    start = date(2026, 1, 5)
    check("date in week 0", service.week_index("2026-01-06", start, 4) == 0)
    check("date in week 2", service.week_index("2026-01-20", start, 4) == 2)
    check("bucket boundary rolls to next week", service.week_index("2026-01-12", start, 4) == 1)
    check("date before window is None", service.week_index("2025-12-31", start, 4) is None)
    check("date after window is None", service.week_index("2026-02-02", start, 4) is None)
    check("datetime string is tolerated", service.week_index("2026-01-13 09:30:00", start, 4) == 1)
    check("garbage date is None", service.week_index("not-a-date", start, 4) is None)


# ── 2. Leads-without-GSC and GSC-without-leads in the same assembly ─────────

def test_assemble_mixed_series():
    start = date(2026, 1, 5)
    daily = [
        {"date": "2026-01-06", "clicks": 5, "impressions": 100},   # week 0
        {"date": "2026-01-07", "clicks": 3, "impressions": 40},    # week 0
        {"date": "2025-12-01", "clicks": 999, "impressions": 999},  # out of window -> dropped
    ]
    leads = [{"date": "2026-01-20", "count": 3}]  # week 2, no GSC that week
    tasks = [{"title": "Published a page", "category": "content", "status": "done",
              "week_of": "2026-01-13", "created_at": "2026-01-13 10:00:00"}]  # week 1

    weekly = service.assemble_weekly(start, 4, daily, leads, tasks)

    check("week 0 has GSC, no leads", weekly[0]["clicks"] == 8 and weekly[0]["impressions"] == 140
          and weekly[0]["leads_count"] == 0, str(weekly[0]))
    check("week 1 has the work item", len(weekly[1]["work_items"]) == 1
          and weekly[1]["clicks"] == 0, str(weekly[1]))
    check("week 2 has leads, no GSC", weekly[2]["leads_count"] == 3
          and weekly[2]["clicks"] == 0 and weekly[2]["impressions"] == 0, str(weekly[2]))
    check("out-of-window GSC row was dropped (no edge inflation)",
          sum(w["clicks"] for w in weekly) == 8, f"total clicks={sum(w['clicks'] for w in weekly)}")


# ── 4. Query movers: new entrant + material climb, noise excluded ───────────

def test_query_movers():
    earliest = [
        {"query": "soft wash", "position": 9.0, "clicks": 5, "impressions": 200},
        {"query": "roof cleaning", "position": 18.0, "clicks": 2, "impressions": 100},
    ]
    latest = [
        {"query": "soft wash", "position": 4.0, "clicks": 20, "impressions": 400},        # 9 -> 4 = up
        {"query": "pressure washing", "position": 7.0, "clicks": 12, "impressions": 300},  # new
        {"query": "roof cleaning", "position": 17.0, "clicks": 3, "impressions": 120},     # 18 -> 17 = noise
    ]
    movers = service.compute_query_movers(earliest, latest)
    by_q = {m["query"]: m for m in movers}

    check("material climber is included as 'up'",
          by_q.get("soft wash", {}).get("status") == "up"
          and by_q["soft wash"]["delta"] == 5.0, str(by_q.get("soft wash")))
    check("new entrant is included as 'new'",
          by_q.get("pressure washing", {}).get("status") == "new"
          and by_q["pressure washing"]["from_position"] is None, str(by_q.get("pressure washing")))
    check("sub-threshold move is excluded", "roof cleaning" not in by_q, str(list(by_q)))
    check("new entrants sort ahead of climbers", movers[0]["status"] == "new", str(movers))


# ── 3 + full path. Async: empty-everything, then a populated build ──────────

async def _init_db():
    await init_gsc_tables()
    await init_tracking_tables()
    await init_reporting_tables()


async def _test_e2e_empty():
    cid = await upsert_client(
        slug="emptyco", client_name="Empty Co", client_email="e@e.com",
        site_url="https://empty.example.com", money_keywords=[],
        gsc_property="sc-domain:empty.example.com",
    )
    client = {"slug": "emptyco", "gsc_property": "sc-domain:empty.example.com"}
    # GSC is unconfigured (no env), no leads, no tasks, no snapshots.
    res = await service.build_growth_timeline(client, cid, weeks=6, force=False)

    check("empty: no crash, weekly has `weeks` buckets", len(res["weekly"]) == 6, str(len(res["weekly"])))
    check("empty: has_gsc is false", res["has_gsc"] is False)
    check("empty: has_leads is false", res["has_leads"] is False)
    check("empty: gsc_state is not_connected", res["gsc_state"] == "not_connected", res["gsc_state"])
    check("empty: query_movers empty", res["query_movers"] == [])
    check("empty: every bucket is a real zero",
          all(w["clicks"] == 0 and w["impressions"] == 0 and w["leads_count"] == 0
              and w["work_items"] == [] for w in res["weekly"]))
    check("empty: echoes the date range used",
          bool(res["date_range"]["start"]) and bool(res["date_range"]["end"])
          and res["date_range"]["weeks"] == 6)


async def _test_e2e_populated():
    cid = await upsert_client(
        slug="popco", client_name="Pop Co", client_email="p@p.com",
        site_url="https://pop.example.com", money_keywords=[],
        gsc_property="sc-domain:pop.example.com",
    )
    client = {"slug": "popco", "gsc_property": "sc-domain:pop.example.com"}

    end = gsc.default_end()
    d_recent = (end - timedelta(days=2)).isoformat()
    d_old = (end - timedelta(days=16)).isoformat()

    # Mock the GSC client: configured + a two-day daily series, both in-window.
    gsc.is_configured = lambda: True
    gsc.daily_metrics = lambda prop, days: {
        "rows": [
            {"date": d_recent, "clicks": 4, "impressions": 80, "ctr": 0.05, "position": 6.0},
            {"date": d_old, "clicks": 1, "impressions": 30, "ctr": 0.03, "position": 12.0},
        ],
        "no_data": False,
        "date_range": {"start": d_old, "end": d_recent, "days": days},
    }

    # A lead dated inside the window (raw insert so we control created_at).
    lead_dt = (end - timedelta(days=3)).isoformat() + " 09:00:00"
    async with aiosqlite.connect(os.environ["DB_PATH"]) as db:
        await db.execute(
            "INSERT INTO tracked_events (slug, event_type, source, meta_json, created_at) "
            "VALUES (?, 'lead', 'website', '{}', ?)",
            ("popco", lead_dt),
        )
        await db.commit()

    await add_task("popco", "Optimized the Google Business Profile", category="gbp",
                   status="done", week_of=(end - timedelta(days=2)).isoformat())

    res = await service.build_growth_timeline(client, cid, weeks=4, force=True)

    check("populated: has_gsc is true", res["has_gsc"] is True)
    check("populated: has_leads is true", res["has_leads"] is True)
    check("populated: gsc_state ok", res["gsc_state"] == "ok", res["gsc_state"])
    check("populated: clicks summed across weeks == 5",
          sum(w["clicks"] for w in res["weekly"]) == 5,
          f"total={sum(w['clicks'] for w in res['weekly'])}")
    check("populated: exactly one lead counted",
          sum(w["leads_count"] for w in res["weekly"]) == 1,
          f"total={sum(w['leads_count'] for w in res['weekly'])}")
    check("populated: the work item landed in a week",
          sum(len(w["work_items"]) for w in res["weekly"]) == 1)


async def _test_e2e_query_movers_from_cache():
    """Two cached 'query' snapshots on different window ends -> movers surface
    without any fresh pull (reuse-only contract)."""
    cid = await upsert_client(
        slug="moverco", client_name="Mover Co", client_email="m@m.com",
        site_url="https://mover.example.com", money_keywords=[],
        gsc_property="sc-domain:mover.example.com",
    )
    await save_snapshot(cid, "query", "2026-05-01", "2026-05-28",
                        {"rows": [{"query": "soft wash", "position": 15.0, "clicks": 1, "impressions": 50}],
                         "no_data": False})
    await save_snapshot(cid, "query", "2026-06-01", "2026-06-28",
                        {"rows": [{"query": "soft wash", "position": 5.0, "clicks": 9, "impressions": 300}],
                         "no_data": False})
    client = {"slug": "moverco", "gsc_property": "sc-domain:mover.example.com"}
    # is_configured is still monkeypatched True from the populated test; daily
    # metrics returns nothing meaningful here — we only assert the movers.
    gsc.daily_metrics = lambda prop, days: {"rows": [], "no_data": True, "date_range": {}}
    res = await service.build_growth_timeline(client, cid, weeks=4, force=True)
    movers = {m["query"]: m for m in res["query_movers"]}
    check("movers surface from two cached snapshots",
          movers.get("soft wash", {}).get("status") == "up"
          and movers["soft wash"]["delta"] == 10.0, str(res["query_movers"]))


async def _run_async():
    await _init_db()
    await _test_e2e_empty()
    await _test_e2e_populated()
    await _test_e2e_query_movers_from_cache()


def main():
    for t in (test_week_buckets, test_week_index, test_assemble_mixed_series, test_query_movers):
        t()
    try:
        asyncio.run(_run_async())
    finally:
        try:
            os.unlink(_TMP.name)
        except OSError:
            pass

    print()
    if _failures:
        print(f"❌ {len(_failures)} failure(s): {', '.join(_failures)}")
        raise SystemExit(1)
    print("✅ all Growth Timeline tests passed")


if __name__ == "__main__":
    main()
