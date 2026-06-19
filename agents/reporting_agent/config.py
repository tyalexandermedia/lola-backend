"""
Agent Two — config + env loaders.

Per-client config lives in SQLite (db.reporting_clients table). This file
only handles backend env wiring + the alert email Ty receives on failure.
"""

import os

ANTHROPIC_API_KEY = (os.getenv("ANTHROPIC_API_KEY") or "").strip() or None
ANTHROPIC_MODEL = os.getenv("REPORTING_AGENT_MODEL", "claude-opus-4-7").strip()

BREVO_API_KEY = (os.getenv("BREVO_API_KEY") or "").strip() or None
BREVO_REPORT_TEMPLATE_ID = int(os.getenv("BREVO_REPORT_TEMPLATE_ID", "0") or 0)

# ── Google service-account credentials ──────────────────────────────────────
# Preferred: inline JSON string (easier to set in Railway / Vercel secrets).
# Fallback:  file path (for local dev or if you mount the JSON as a volume).
# The fetchers check JSON first, then fall back to the file path.
#
# GA4 Data API (organic sessions widget):
#   GA4_SERVICE_ACCOUNT_JSON   — full service-account JSON as a single-line string
#   GA4_PROPERTY_ID            — numeric GA4 property id, e.g. "properties/123456789"
#   GA_CREDENTIALS_PATH        — legacy: path to the same JSON on disk (optional)
#   GA_DEFAULT_PROPERTY_ID     — legacy alias for GA4_PROPERTY_ID
#
# Google Search Console (organic clicks widget):
#   GSC_SERVICE_ACCOUNT_JSON   — full service-account JSON (can be same creds as GA4)
#   GSC_CREDENTIALS_PATH       — legacy: path to the JSON on disk (optional)

GA4_SERVICE_ACCOUNT_JSON = (os.getenv("GA4_SERVICE_ACCOUNT_JSON") or "").strip() or None
GA4_PROPERTY_ID = (
    (os.getenv("GA4_PROPERTY_ID") or os.getenv("GA_DEFAULT_PROPERTY_ID") or "").strip() or None
)
# Legacy file-path fallbacks kept for local dev / volume mounts.
GA_CREDENTIALS_PATH = os.getenv("GA_CREDENTIALS_PATH", "").strip() or None
GA_DEFAULT_PROPERTY_ID = GA4_PROPERTY_ID  # alias — code that imported the old name still works

# GSC creds fall back to the GA4 service-account JSON — the same service
# account normally has access to both APIs, so you only need to set one var.
GSC_SERVICE_ACCOUNT_JSON = (
    os.getenv("GSC_SERVICE_ACCOUNT_JSON") or os.getenv("GA4_SERVICE_ACCOUNT_JSON") or ""
).strip() or None
GSC_CREDENTIALS_PATH = (
    os.getenv("GSC_CREDENTIALS_PATH") or os.getenv("GA_CREDENTIALS_PATH") or ""
).strip() or None

# Alert email Ty receives if any step fails for a client.
ALERT_EMAIL = os.getenv("REPORTING_ALERT_EMAIL", "ty@tyalexandermedia.com").strip()

# Hard cap on retries before alerting Ty.
ANTHROPIC_RETRIES = int(os.getenv("REPORTING_ANTHROPIC_RETRIES", "3"))
BREVO_RETRY_DELAY_SEC = int(os.getenv("REPORTING_BREVO_RETRY_SEC", "300"))


def is_configured() -> tuple[bool, str]:
    """Returns (ok, reason). Lets the orchestrator bail early with a clear msg."""
    missing = []
    if not ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")
    if not BREVO_API_KEY:
        missing.append("BREVO_API_KEY")
    if not BREVO_REPORT_TEMPLATE_ID:
        missing.append("BREVO_REPORT_TEMPLATE_ID")
    if missing:
        return False, f"Missing env: {', '.join(missing)}"
    return True, "ok"
