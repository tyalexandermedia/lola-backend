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

# GSC + GA both require service-account JSON paths (mounted at Railway as
# /etc/secrets/* or as base64 env vars decoded at boot).
GSC_CREDENTIALS_PATH = os.getenv("GSC_CREDENTIALS_PATH", "").strip() or None
GA_CREDENTIALS_PATH = os.getenv("GA_CREDENTIALS_PATH", "").strip() or None
GA_DEFAULT_PROPERTY_ID = os.getenv("GA_DEFAULT_PROPERTY_ID", "").strip() or None

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
