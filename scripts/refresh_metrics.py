"""
Weekly metrics refresh — Railway cron entrypoint.

    python -m scripts.refresh_metrics

POSTs to the deployed /admin/metrics/run-all endpoint, which refreshes
GSC + GA + GBP + Bing + CWV + rankings + AI Share of Voice for every
active client. Keeps the secret out of the cron URL (header instead).

Env:
    LOLA_BASE_URL          default https://lola-backend-production.up.railway.app
    LOLA_SECRET_ADMIN_KEY  required — same key the admin endpoints use

Prefer cron-job.org hitting the URL directly (see docs/METRICS_CRON.md);
this script is the in-Railway alternative when you'd rather not expose the
key in a cron-service config.
"""

import os
import sys

import httpx

BASE = os.getenv("LOLA_BASE_URL", "https://lola-backend-production.up.railway.app").rstrip("/")
KEY = os.getenv("LOLA_SECRET_ADMIN_KEY", "")


def main() -> int:
    if not KEY:
        print("ERROR: LOLA_SECRET_ADMIN_KEY not set", file=sys.stderr)
        return 2
    url = f"{BASE}/admin/metrics/run-all"
    try:
        # Generous timeout — refreshes every client sequentially.
        r = httpx.post(url, headers={"X-Admin-Key": KEY}, timeout=600.0)
        r.raise_for_status()
        data = r.json()
        print(f"✅ refreshed {data.get('clients', 0)} client(s)")
        for slug, res in (data.get("results") or {}).items():
            print(f"  · {slug}: {res}")
        return 0
    except Exception as e:
        print(f"❌ refresh failed: {type(e).__name__}: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
