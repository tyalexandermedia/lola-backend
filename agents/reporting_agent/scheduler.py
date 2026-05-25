"""
Cron entry point. Railway hobby tier doesn't ship a native cron, so the
recommended setup is:

  Option A — Free, external (recommended for Lola right now):
    1. Sign up at https://cron-job.org/ (free)
    2. Schedule: every Monday 07:00 America/New_York
    3. URL: https://lola-backend-production.up.railway.app/admin/reporting/run-weekly
    4. Method: POST
    5. Header: X-Admin-Key: <LOLA_SECRET_ADMIN_KEY>

  Option B — Railway native cron (paid plan only):
    Add a `[deploy.cron]` block to railway.toml:
      [[cron]]
      schedule = "0 12 * * 1"   # 07:00 ET = 12:00 UTC (no DST handling)
      command  = "python -m agents.reporting_agent.scheduler"

This module exposes a callable `cli_main` that does the same work as the
HTTP endpoint, so Option B works without any HTTP layer.
"""

from __future__ import annotations
import asyncio
import json

from agents.reporting_agent.main import run_weekly_for_all_active
from db.reporting import init_reporting_tables


async def _amain() -> dict:
    await init_reporting_tables()
    return await run_weekly_for_all_active()


def cli_main() -> None:
    """Entry point for `python -m agents.reporting_agent.scheduler`."""
    out = asyncio.run(_amain())
    print(json.dumps(out, indent=2)[:8000])


if __name__ == "__main__":
    cli_main()
