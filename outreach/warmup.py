"""
Domain warmup ramp.

Spec:
  Week 1   (days 0-6):    10 sends/day
  Week 2   (days 7-13):   25 sends/day
  Week 3+  (days 14+):    50 sends/day

Override with env var OUTREACH_DAILY_CAP_OVERRIDE for testing.
"""

import os
from datetime import date


def _parse_launch_date() -> date:
    raw = os.getenv("OUTREACH_LAUNCH_DATE", "").strip()
    if raw:
        try:
            return date.fromisoformat(raw)
        except ValueError:
            pass
    # Default: treat today as launch (most conservative — cap=10).
    return date.today()


def daily_cap_for_today() -> int:
    override = os.getenv("OUTREACH_DAILY_CAP_OVERRIDE", "").strip()
    if override.isdigit():
        return int(override)

    days_since = (date.today() - _parse_launch_date()).days
    if days_since < 7:
        return 10
    if days_since < 14:
        return 25
    return 50


def warmup_phase() -> str:
    cap = daily_cap_for_today()
    if cap <= 10:
        return "warmup_week_1"
    if cap <= 25:
        return "warmup_week_2"
    return "full_volume"
