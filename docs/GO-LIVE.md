# Lola — Go-Live Checklist

Everything is **built and deployed**. What's left is flipping switches. Do it in
this order — each step lights up more of the funnel. Nothing here needs code.

Two places you set values:
- **Vercel** (frontend) → Project → Settings → Environment Variables. These are
  the `VITE_*` vars. Redeploy after changing them.
- **Railway** (backend / `main.py`) → your service → Variables. Everything else.

> Tip: keep your admin key handy. `export KEY=<your LOLA_SECRET_ADMIN_KEY>` and
> `export API=https://<your-backend-host>` for the verify commands below.

---

## Step 1 — Stripe (pay-now: DIY, Build, and the monthly)

**In the Stripe dashboard, create 3 Payment Links:**

| Link | Type | Price | Success redirect |
|------|------|-------|------------------|
| DIY | One-time | $197 | `https://lola.tyalexandermedia.com/diy?session_id={CHECKOUT_SESSION_ID}` |
| Full Build | One-time | $997 | `https://lola.tyalexandermedia.com/build/start?session_id={CHECKOUT_SESSION_ID}` |
| Lola Managed | **Subscription** | $297/mo | (none needed) |

**Then set the webhook:** Stripe → Developers → Webhooks → add endpoint
`https://<backend>/stripe/webhook`, event **`checkout.session.completed`**.
Copy the signing secret (`whsec_…`).

**Vercel vars:**
```
VITE_STRIPE_DIY_URL     = <the $197 link>
VITE_STRIPE_BUILD_URL   = <the $997 link>
VITE_STRIPE_MANAGED_URL = <the $297/mo subscription link>
```

**Railway vars:**
```
STRIPE_SECRET_KEY     = sk_live_…
STRIPE_WEBHOOK_SECRET = whsec_…            # from the webhook you just made
STRIPE_DIY_AMOUNT     = 19700              # already default
STRIPE_BUILD_AMOUNT   = 99700              # already default
# For the audit-email upsell links (mirror the same two one-time links):
STRIPE_SPRINT_URL     = <the $197 link>
STRIPE_RETAINER_URL   = <the $997 link>
```

✅ **Now live:** pay-now buttons on `/pricing`, `/diy`, `/retainer`; buyers get
instant access; the Stripe webhook records the sale, stops their prospect
nurture, and starts their post-build → Managed nurture.

**Verify:** buy the DIY link in test mode → you should land on `/diy` unlocked.

---

## Step 2 — Resend (email: audit results + nurture)

**Railway vars:**
```
RESEND_API_KEY        = re_…
AUDIT_FROM_EMAIL      = Coach Ty (Lola) <ty@tyalexandermedia.com>
AUDIT_REPLY_TO_EMAIL  = ty@tyalexandermedia.com
PUBLIC_APP_URL        = https://lola.tyalexandermedia.com
```

✅ **Now live:** Growth Score result emails, the prospect nurture (nudge →
guarantee → final), and the post-build → $297/mo nurture — all send by email.

**Verify:**
```
curl -H "X-Admin-Key: $KEY" $API/followups/stats
curl -X POST -H "X-Admin-Key: $KEY" $API/followups/run   # forces a scan now
```

---

## Step 3 — Twilio (SMS: Growth Score text, nurture text, Missed-Call Text-Back)

**Railway vars:**
```
TWILIO_ENABLED      = true
TWILIO_ACCOUNT_SID  = AC…
TWILIO_AUTH_TOKEN   = …
TWILIO_FROM_NUMBER  = +1727…      # your Lola sending number
```

✅ **Now live:** Growth Score delivered by text; nurture texts; and Missed-Call
Text-Back is ready (turn it on per client in Step 6). Every text auto-appends
"Reply STOP to opt out."

---

## Step 4 — The demo video ("See how it works")

Record a 60–90s Loom (Growth Score → build → ranking). Then:

**Vercel var:**
```
VITE_EXPLAINER_VIDEO_URL = <your Loom / YouTube / Vimeo share link>
```

✅ The "See how Lola works" button appears in the homepage hero. Until set, it
renders nothing — no dead button.

---

## Step 5 — Follow-up cadence (optional tuning)

All have sensible defaults; only touch to change timing.
```
FOLLOWUP_ENABLED          = true        # default
FOLLOWUP_MANAGED_PRICE    = $297/mo      # the monthly's display price
FOLLOWUP_MANAGED_URL      = <blank>      # blank → points at /managed page (recommended)
# Prospect cadence (hours):
FOLLOWUP_STEP1_HOURS      = 24
FOLLOWUP_STEP2_GAP_HOURS  = 48
FOLLOWUP_STEP3_GAP_HOURS  = 96
# Post-build → Managed cadence (days):
FOLLOWUP_BUILD_STEP1_DAYS = 25
FOLLOWUP_BUILD_GAP12_DAYS = 7
FOLLOWUP_BUILD_GAP23_DAYS = 14
```

---

## Step 6 — Per-client, when you land a Managed client

**a) Point their tracking number at Lola** (this is the existing call-tracking
setup): buy a Twilio number, set its Voice webhook to
`https://<backend>/twilio/voice/<client-slug>`, status callback to
`https://<backend>/twilio/status/<client-slug>`, and store their real number as
`forward_number` on their client record. Put the Twilio number on their Google
Business "Call" field.

**b) Turn on Missed-Call Text-Back for them:**
```
curl -X POST -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"enabled":true,"quote_url":"https://theirsite.com/quote"}' \
  $API/mctb/config/<client-slug>
```
Message supports `{business}` and `{quote}` placeholders; omit `template` to use
the default. Check it:
```
curl -H "X-Admin-Key: $KEY" $API/mctb/stats/<client-slug>
```

---

## Also good to have set (probably already are)

```
# Vercel
VITE_API_URL      = https://<backend>
VITE_CALENDAR_URL = https://calendar.app.google/J7idjUDitd2Hziuc7

# Railway
LOLA_SECRET_ADMIN_KEY = <random string; gates all admin endpoints>
ANTHROPIC_API_KEY     = <powers the live "what AI says about you" feature>
PUBLIC_API_BASE       = https://<backend>   # used to build Twilio callback URLs
MCTB_ENABLED          = true                # global switch (per-client still opt-in)
```

---

## Priority if you're short on time before outreach

1. **Stripe DIY + Build links** (Step 1) — so people can actually pay.
2. **Resend** (Step 2) — so results + nurture go out.
3. Everything else can follow once you've got builds in flight.

The offer itself — Free Score → $997 Build + Half-Back Guarantee → `/work`
proof — is already live and enough to start swinging.
