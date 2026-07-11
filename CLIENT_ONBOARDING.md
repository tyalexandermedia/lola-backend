# CLIENT_ONBOARDING

The runbook for taking a home-services contractor from Growth Score to a
delivered win — and, when it fits, onto the $297/mo Managed continuity. Written
for the operator (Ty). Contractor-fluent, less-is-more.

> Living document. Coach Ty can paste over any section with canonical wording.

## The funnel (what they move through)

```
Free Growth Score → nurture → $197 DIY  or  $997 Full Build → deliver a win
                                                     ↓ (30 days)
                                              $297/mo Lola Managed (continuity)
```

## 1. Growth Score (free)

- Lead submits the Growth Score form (name, email optional, phone required,
  city, service). They get a score + revenue-leak estimate.
- Backend saves the lead, texts/emails the result (when providers are on),
  enrolls the prospect follow-up sequence, and — when
  `GHL_INBOUND_WEBHOOK_URL` is set — bridges the contact into GoHighLevel
  tagged **growth-score** in the "New Growth Score Lead" stage.
- Nurture runs automatically: nudge (~24h) → Half-Back Guarantee (~72h) →
  final (~7d). Dormant until Resend/Twilio configured; STOP always honored.

## 2. They buy

**$197 DIY (one-time).** Score + 5-step checklist. Buyer lands on `/diy`
(unlocked via verified Stripe session). Positioning: "See your score. Fix it
yourself."

**$997 Full Build (one-time, done-for-you).** Site built + 30 days of Google +
AI visibility + GBP optimization + direct access to Ty. Backed by the
**Half-Back Guarantee**:

> "We pick 5 money keywords for your business together in week 1. If we don't
> get at least 1 of them ranking on page 1 or in the map pack within 30 days,
> you get half your investment back. No fine print."

On purchase, the Stripe webhook converts the lead, stops prospect nurture, and
(for a Build) starts the post-build → Managed nurture timed to the 30-day mark.

## 3. Deliver the Full Build (the 30-day window)

- **Week 1:** pick 5 money keywords with the client (this anchors the
  guarantee). Build/refresh the site. Optimize the Google Business Profile.
- **Weeks 2–4:** Google + AI-visibility work; confirm they're showing up in
  ChatGPT / Perplexity / Gemini answers. Land at least one page-1 / map-pack
  ranking to satisfy the guarantee.
- **Proof:** only capture real results. Real clients used as proof: Sandbar
  Soft Wash, Tampa Bay Power Clean, Travels by Val. Never invent.

## 4. Convert to $297/mo Managed (continuity)

The post-build nurture (~day 25/32/46) points at `/managed`. Managed keeps them
ranked + reviewed + followed up: Missed-Call Text-Back, review engine, lead
follow-up, GBP/SEO, AI-visibility monitoring, live dashboard. **Never shouted
at cold traffic — nurture/email + `/managed` only.**

### Turn on per-client tooling (when they're Managed)

Point their tracking number at Lola, then enable Missed-Call Text-Back:

```
# a) Twilio number → Voice webhook /twilio/voice/<slug>,
#    status callback /twilio/status/<slug>; store their real number as
#    forward_number on the client record; put the Twilio number on their GBP.

# b) Enable MCTB:
curl -X POST -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"enabled":true,"quote_url":"https://theirsite.com/quote"}' \
  $API/mctb/config/<client-slug>

# check it:
curl -H "X-Admin-Key: $KEY" $API/mctb/stats/<client-slug>
```

## Sandbar Soft Wash (first client)

- Canonical domain: **sandbarsoftwash.com**.
- First real client — use their launch to validate the full funnel end to end
  before scaling outreach.

## Guardrails

- "Growth Score", never "audit".
- Public pricing is two-tier ($197 / $997); $297/mo stays nurture-only.
- `/lp/*` pages are sacred. No fabricated proof. Every SMS ends "Reply STOP to
  opt out." Nothing is live until merged to `main`.
