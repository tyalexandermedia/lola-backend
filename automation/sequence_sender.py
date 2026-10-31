"""
Coach Ty Leads — Nurture Email Sequence Sender
Sends 3 emails at D+0 (2hr), D+2, D+5 after a free Growth Score / Revenue
Opportunity Assessment. Uses Resend API + asyncio.sleep for delays (Railway
keeps the process alive). {{placeholders}} are filled with real assessment data.

⚠️  DORMANT BY DESIGN. Nothing imports run_nurture_sequence, so no email in this
module sends until it is explicitly wired up.

The three templates in ./emails sell the CURRENT single offer — the Lola Local
Growth System at $497/month + a one-time setup from $497 — with CTAs to the
booking call and /pricing (source of truth: docs/PRICING.md). They carry no
fabricated results, revenue figures, or ranking guarantees.

Before activating (Phase B), the caller MUST:
  1. Pass a `stop_check` that returns True once the contact has booked a call or
     purchased, so promotional follow-up stops (never email a customer a pitch).
  2. Ensure the booking route (https://www.coachtyleads.com/book) is live.
  3. De-dupe enrollment so a contact can't be put through the sequence twice.
  4. Add a List-Unsubscribe header on the Resend send (the templates also carry a
     visible unsubscribe link).
"""
import asyncio, httpx, logging, os
from pathlib import Path

logger = logging.getLogger("lola.sequence")

EMAILS_DIR  = Path(__file__).parent / "emails"
FROM_EMAIL  = "Coach Ty Leads <ty@tyalexandermedia.com>"
RESEND_URL  = "https://api.resend.com/emails"

# Sequence: (filename, subject_template, delay_seconds)
SEQUENCE = [
    (
        "email1_day0.html",
        "🐾 {business_name} — your Revenue Opportunity Assessment ({score}/100)",
        7200,   # 2 hours
    ),
    (
        "email2_day2.html",
        "The customer opportunities {business_name} may be missing",
        172800, # 48 hours
    ),
    (
        "email3_day5.html",
        "A simpler system for growing {business_name}",
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


async def run_nurture_sequence(to_email: str, audit: dict, resend_key: str,
                               stop_check=None):
    """
    Fire all 3 nurture emails with proper delays.
    Runs as a background asyncio task — Railway keeps the process alive.

    stop_check: optional callable () -> bool (sync or async). Checked before each
    send; when it returns True (the contact has booked a call or purchased) the
    sequence stops, so a customer is never sent promotional follow-up. Wire this
    before activating — see the module docstring.
    """
    if not resend_key or not to_email:
        logger.warning("Sequence skipped — missing Resend key or email")
        return

    vars_ = _build_vars(audit)
    logger.info(f"Starting nurture sequence for {to_email} | {vars_['business_name']}")

    for filename, subject_tpl, delay_secs in SEQUENCE:
        # Wait for the delay
        await asyncio.sleep(delay_secs)

        # Stop promotional follow-up once the contact has booked or purchased.
        if stop_check is not None:
            try:
                done = stop_check()
                if asyncio.iscoroutine(done):
                    done = await done
                if done:
                    logger.info(f"Sequence stopped early (booked/purchased) → {to_email}")
                    return
            except Exception as e:
                logger.error(f"stop_check error (continuing): {e}")

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
