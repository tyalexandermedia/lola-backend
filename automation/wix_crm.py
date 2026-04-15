"""
LOLA SEO — Wix CRM Integration
Creates/updates a contact in Wix CRM on every completed audit.
Contact includes: business name, city, score, grade, revenue leak,
business type, website — all stored as custom extended fields.
Labels: "lola-seo-lead" + grade-based label (e.g. "lola-grade-f")
"""
import httpx, logging

logger = logging.getLogger("lola.wix_crm")

WIX_CONTACTS_URL = "https://www.wixapis.com/contacts/v4/contacts"
WIX_SITE_ID      = "0aaeb589-cfcc-478a-b853-27fa4d471105"


async def upsert_wix_contact(audit: dict, wix_api_key: str) -> bool:
    """
    Create a contact in Wix CRM for the audited business.
    Stores all audit data as extended fields for segmentation.
    Returns True on success.
    """
    if not wix_api_key:
        logger.info("No WIX_API_KEY set — skipping Wix CRM sync")
        return False

    biz   = audit.get("business_name", "")
    email = audit.get("email", "")
    city  = audit.get("city", "")
    score = audit.get("total_score", 0)
    grade = audit.get("grade", "F")
    rev   = audit.get("revenue_leak_monthly", 0)
    btype = audit.get("business_type", "contractor")
    url   = audit.get("website", "")
    leads = audit.get("leads_lost_monthly", "")

    if not email:
        logger.warning("No email in audit — cannot create Wix contact")
        return False

    # Parse first/last from business name (use business name as company)
    name_parts = biz.split(" ", 1)
    first = name_parts[0] if name_parts else biz
    last  = name_parts[1] if len(name_parts) > 1 else ""

    # Grade-based label key (Wix labels use "custom." prefix for custom labels)
    grade_label_key = f"lola-grade-{grade.lower()}"

    payload = {
        "allowDuplicates": False,
        "info": {
            "name": {
                "first": first,
                "last": last
            },
            "emails": {
                "items": [{"tag": "MAIN", "email": email}]
            },
            "company": biz,
            "jobTitle": btype.replace("_", " ").title(),
            # Store audit data as extended fields for segmentation
            "extendedFields": {
                "items": {
                    "custom.lola_score":         str(score),
                    "custom.lola_grade":         grade,
                    "custom.lola_city":          city,
                    "custom.lola_website":       url,
                    "custom.lola_revenue_leak":  str(rev),
                    "custom.lola_leads_lost":    str(leads),
                    "custom.lola_business_type": btype,
                    "custom.lola_source":        "lola-seo-audit",
                }
            },
            # Labels for filtering: all LOLA leads + grade tier
            "labelKeys": {
                "items": ["custom.lola-seo-lead"]
            }
        }
    }

    headers = {
        "Content-Type":  "application/json",
        "Authorization": wix_api_key,
        "wix-site-id":   WIX_SITE_ID,
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(WIX_CONTACTS_URL, json=payload, headers=headers)

        if resp.is_success:
            contact_id = resp.json().get("contact", {}).get("id", "?")
            logger.info(f"Wix CRM contact created: {email} | score {score} | id {contact_id}")
            return True
        elif resp.status_code == 409:
            # Duplicate — contact already exists, that's fine
            logger.info(f"Wix CRM: contact already exists for {email}")
            return True
        else:
            logger.error(f"Wix CRM error {resp.status_code}: {resp.text[:200]}")
            return False

    except Exception as e:
        logger.error(f"Wix CRM exception: {e}")
        return False
