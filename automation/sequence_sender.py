"""
LOLA SEO — Nurture Email Sequence Sender
Sends 3 emails at D+0 (2hr), D+2, D+5 after audit delivery.
Triggered from background task in main.py.
Uses Resend API + asyncio.sleep for delays (Railway keeps process alive).
All placeholder variables are replaced with real audit data.
"""
import asyncio, httpx, logging, os
from pathlib import Path

logger = logging.getLogger("lola.sequence")

EMAILS_DIR  = Path(__file__).parent / "emails"
FROM_EMAIL  = "LOLA SEO <lola@tyalexandermedia.com>"
RESEND_URL  = "https://api.resend.com/emails"

# Sequence: (filename, subject_template, delay_seconds)
SEQUENCE = [
    (
        "email1_day0.html",
        "🐾 {business_name} scored {score}/100 — here's what to fix first",
        7200,   # 2 hours
    ),
    (
        "email2_day2.html",
        "While {business_name} was offline, {competitor_name} got 3 more calls",
        172800, # 48 hours
    ),
    (
        "email3_day5.html",
        "Last thing from Lola about {business_name}'s SEO",
        432000, # 5 days
    ),
]


def _fill(template: str, data: dict) -> str:
    """Replace {{var}} placeholders with real audit values."""
    for k, v in data.items():
        template = template.replace("{{" + k + "}}", str(v) if v else "")
    return template


def _build_vars(audit: dict) -> dict:
    """Extract all placeholder values from audit result."""
    biz   = audit.get("business_name", "Your Business")
    city  = audit.get("city", "your city").split(",")[0].strip()
    score = audit.get("total_score", 0)
    grade = audit.get("grade", "F")
    grade_label = audit.get("grade_label", "Off the Leash")
    revenue = audit.get("revenue_leak_monthly", 0)
    leads   = audit.get("leads_lost_monthly", "20–35")

    # Top issue: first critical, then first high
    issues  = audit.get("issues", [])
    top_issue = ""
    for sev in ("Critical", "High", "Medium"):
        hit = next((i.get("issue","") for i in issues if i.get("severity") == sev), None)
        if hit:
            top_issue = hit
            break

    # Competitor name
    competitors = audit.get("competitors") or []
    comp = competitors[0] if competitors else {}
    comp_name = (comp.get("title") or comp.get("name") or comp.get("business_name") or "").strip()
    if not comp_name:
        comp_name = f"a competitor in {city}"

    grade_emojis = {"A":"🏆","B":"✅","C":"🐾","D":"⚠️","F":"🚨"}

    return {
        "business_name":   biz,
        "city":            city,
        "score":           str(score),
        "grade_label":     grade_label,
        "grade_emoji":     grade_emojis.get(grade, "🚨"),
        "revenue_leak":    str(revenue),
        "leads_lost":      str(leads),
        "top_issue":       top_issue,
        "competitor_name": comp_name,
    }


async def _send_one(to_email: str, subject: str, html: str, resend_key: str) -> bool:
    """Send a single email via Resend."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {resend_key}"},
                json={
                    "from":    FROM_EMAIL,
                    "to":      [to_email],
                    "subject": subject,
                    "html":    html,
                },
            )
        if resp.is_success:
            logger.info(f"Sequence email sent → {to_email} | {subject[:50]}")
            return True
        else:
            logger.error(f"Resend error {resp.status_code}: {resp.text[:200]}")
            return False
    except Exception as e:
        logger.error(f"Sequence send exception: {e}")
        return False


async def run_nurture_sequence(to_email: str, audit: dict, resend_key: str):
    """
    Fire all 3 nurture emails with proper delays.
    Runs as a background asyncio task — Railway keeps the process alive.
    """
    if not resend_key or not to_email:
        logger.warning("Sequence skipped — missing Resend key or email")
        return

    vars_ = _build_vars(audit)
    logger.info(f"Starting nurture sequence for {to_email} | {vars_['business_name']}")

    for filename, subject_tpl, delay_secs in SEQUENCE:
        # Wait for the delay
        await asyncio.sleep(delay_secs)

        # Load + fill template
        email_path = EMAILS_DIR / filename
        if not email_path.exists():
            logger.error(f"Email template not found: {email_path}")
            continue

        html_raw  = email_path.read_text(encoding="utf-8")
        html      = _fill(html_raw, vars_)
        subject   = subject_tpl.format(**{k: v for k, v in vars_.items()})

        await _send_one(to_email, subject, html, resend_key)

    logger.info(f"Nurture sequence complete for {to_email}")
