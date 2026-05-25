"""
Lead-gen generator router.

Takes a contractor's URL + service type, returns a complete starter system:
landing page copy, 3-email follow-up sequence, 3 Facebook ad variants,
tracking/ROI setup, and an implementation checklist.

All five components are generated in parallel via Claude Opus 4.7 over
async httpx so the event loop isn't blocked.
"""

from __future__ import annotations

import asyncio
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/lead-gen", tags=["lead-gen"])

ANTHROPIC_API_KEY = (os.getenv("ANTHROPIC_API_KEY") or "").strip() or None
LEADGEN_MODEL = os.getenv("LEADGEN_MODEL", "claude-opus-4-7").strip()


class LeadGenRequest(BaseModel):
    business_url: str
    service_type: str = "roof cleaning, house washing, soft wash"
    business_name: str = ""


class LeadGenResponse(BaseModel):
    landing_page: str
    emails: str
    ads: str
    tracking: str
    checklist: str
    status: str


async def _claude(prompt: str, max_tokens: int) -> str:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            json={
                "model": LEADGEN_MODEL,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            },
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Claude returned HTTP {resp.status_code}: {resp.text[:200]}",
        )
    data = resp.json()
    text = ""
    for block in data.get("content", []) or []:
        if block.get("type") == "text":
            text += block.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=502, detail="Empty response from Claude")
    return text


@router.post("/generate", response_model=LeadGenResponse)
async def generate_lead_gen_system(request: LeadGenRequest) -> LeadGenResponse:
    """
    Generate complete lead-gen starter pack for a contractor.
    Returns landing page + 3-email sequence + ads + tracking + checklist.
    """
    try:
        landing_page, emails, ads, tracking, checklist = await asyncio.gather(
            _generate_landing_page(request.business_url, request.service_type),
            _generate_email_sequence(request.business_url, request.service_type),
            _generate_ad_copy(request.business_url, request.service_type),
            _generate_tracking_setup(request.business_url),
            _generate_checklist(request.business_url),
        )
        return LeadGenResponse(
            landing_page=landing_page,
            emails=emails,
            ads=ads,
            tracking=tracking,
            checklist=checklist,
            status="generated",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _generate_landing_page(business_url: str, service_type: str) -> str:
    return await _claude(
        prompt=f"""You are a conversion copywriter for a contractor business.

Business: {business_url}
Services: {service_type}
Offer: FREE INSPECTION

Generate landing page copy for a free inspection offer landing page.

Output sections (use these exact headers):

## HERO SECTION
[Headline + Subheadline - problem/solution focused]

## VALUE PROPOSITION
[2-3 paragraphs explaining what the inspection includes and why it matters]

## 3 BENEFIT BULLETS
[3 specific benefits with outcomes - use checkmarks]

## SOCIAL PROOF
[2 short customer testimonials (2-3 sentences each)]

## FORM FIELDS
[List the form fields: First Name | Phone | Email | Best Time to Call | Specific Question]

## CTA COPY
[Copy for the submit button and post-form confirmation message]

Keep copy:
- Conversion-focused
- Direct, no fluff
- Problem -> Solution -> CTA
- Copy-paste ready for Wix
- Under 500 total words""",
        max_tokens=1500,
    )


async def _generate_email_sequence(business_url: str, service_type: str) -> str:
    return await _claude(
        prompt=f"""You are a direct-response email copywriter for a contractor.

Business: {business_url}
Services: {service_type}

Write a 3-email follow-up sequence for leads who submit the free inspection form.

Requirements for all emails:
- Under 150 words each
- Direct, no BS, no corporate speak
- Include 1 CTA per email
- Written in first person as business owner (authentic, contractor voice)
- Conversational tone

EMAIL 1 (Same day): Confirmation + Value
- Subject line
- Confirm inspection booking
- Preview what they'll learn
- Build anticipation

EMAIL 2 (Day 3 if no response): Social Proof
- Subject line
- Share case study/success story (real number: $X cleaning vs $Y replacement)
- Show they're not alone
- Light urgency

EMAIL 3 (Day 7 if still no response): Final Pitch
- Subject line
- Mention retention program / retainer option
- Emphasize protection/prevention
- Final CTA

Format as:

## EMAIL 1: [Subject Line]
[Body]

## EMAIL 2: [Subject Line]
[Body]

## EMAIL 3: [Subject Line]
[Body]""",
        max_tokens=1500,
    )


async def _generate_ad_copy(business_url: str, service_type: str) -> str:
    return await _claude(
        prompt=f"""You are a Facebook ad copywriter for a contractor.

Business: {business_url}
Services: {service_type}
Offer: FREE INSPECTION
Target: Homeowners 35-65, local area
Ad Budget: $50 test spend

Generate 3 Facebook ad copy variants (not carousel, single image ads).

Each ad must be:
- 2-3 short sentences max
- Action-oriented, conversational
- Direct, no fluff
- Include primary benefit/pain point
- Start with hook

Format:

## AD VARIANT 1: [Headline Theme - e.g., "Urgency", "Problem", "Social Proof"]
[Ad body - 2-3 sentences]

## AD VARIANT 2: [Headline Theme]
[Ad body]

## AD VARIANT 3: [Headline Theme]
[Ad body]

Then add:

## AD TARGETING
- Age: 35-65
- Location: [Local area - Pinellas, Pasco, Hillsborough, Manatee counties for Tampa Bay]
- Interests: Home improvement, real estate, contractors, property maintenance
- Exclusions: Competitors (if applicable)
- Budget: $50 test spend

## EXPECTED METRICS
- Cost per lead: $10-15
- Leads from $50 budget: 3-5
- Conversion rate (lead -> inspection): 20-30%

## SCALING RULES
- If CPC > $15: Pause and test new creative
- If CPC < $10: Scale budget by 25% weekly
- Pause any ad with CTR < 1%""",
        max_tokens=800,
    )


async def _generate_tracking_setup(business_url: str) -> str:
    return await _claude(
        prompt=f"""You are a conversion optimization consultant.

Business: {business_url}

Create a COMPLETE tracking and measurement system for their lead generation campaign (free inspection offer).

Provide:

## METRICS TO TRACK
List 10 key metrics:
1. [Metric name]
2. [Metric name]
... (explain how to track each)

## GOOGLE SHEETS TEMPLATE
Provide CSV-format table headers for daily tracking:
Date | Page Views | Form Submissions | Phone Calls | Inspections Booked | Customers Closed | Revenue | Ad Spend | Cost Per Lead | ROI

## ROI CALCULATION FORMULA
Show the formula:
ROI = (Customers x Average Service Price - Total Ad Spend) / Total Ad Spend x 100

Include example calculation.

## 30-DAY MEASUREMENT PLAN

Week 1: [What to track]
Week 2: [What to optimize]
Week 3: [What to test]
Week 4: [Scale or pivot decision]

## SCALING DECISION FRAMEWORK

IF cost per lead > $15 -> [Action]
IF cost per lead < $10 -> [Action]
IF conversion rate < 20% -> [Action]
IF conversion rate > 40% -> [Action]

## SUCCESS TARGETS (30 days)
- Page views: 100+
- Form submissions: 5-10
- Inspections booked: 3-5
- Customers: 1-3
- Revenue: $600-1,800
- ROI: 1,000%+ (on $50 ad spend)""",
        max_tokens=1200,
    )


async def _generate_checklist(business_url: str) -> str:
    return await _claude(
        prompt=f"""Create a step-by-step implementation checklist for {business_url}'s lead generation campaign.

Format as actionable checkbox list:

## WEEK 1 SETUP (Total: 1 hour)

### Day 1: Build Landing Page (30 mins)
[ ] Task | Time | Difficulty (Easy/Medium/Hard) | Critical (Yes/No)

### Day 1-2: Set Up Lead Capture (20 mins)
[ ] Task

### Day 2: Email Automation (10 mins)
[ ] Task

## WEEK 1 LAUNCH (Immediate)

### Google Business Profile (10 mins)
[ ] Task

### Facebook Ad Setup (20 mins)
[ ] Task
[ ] Task

### Email List (15 mins)
[ ] Task

## WEEK 2-4 OPTIMIZATION

### Daily Tracking (5 mins/day)
[ ] Task

### Weekly Analysis (30 mins/week)
[ ] Task

## EXPECTED RESULTS (30 DAYS)

- Landing page views: 50-150
- Form submissions: 5-10
- Phone calls: 3-5
- Inspections booked: 2-4
- Customers: 1-3
- Revenue: $600-1,800
- ROI: 1,000%+ on $50 spend

## SUCCESS METRICS

- Conversion rate (submissions -> inspections): 40%+
- Conversion rate (inspections -> customers): 40%+
- Cost per lead: <$15
- Cost per customer: <$300

## WHEN TO SCALE

- IF CPL < $10: Increase budget by 25%
- IF conversion > 30%: Double down on winning ad
- IF revenue > $1,000: Allocate to next month""",
        max_tokens=800,
    )
