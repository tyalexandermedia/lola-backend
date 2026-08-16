# Lola — setup checklist

Every variable below was read out of the code, not from memory. The file/line
references are where each one is actually consumed, so you can verify any of it
yourself.

**Two places to set things:**

| Where | What lives there | Takes effect |
|---|---|---|
| **Vercel** (frontend) | anything starting `VITE_` | **needs a redeploy** — Vite bakes these in at build time, saving the variable is not enough |
| **Railway** (backend) | everything else | on restart |

---

## 1 · Turn on the review engine — highest ROI

Sandbar has 0 Google reviews. Review count is the biggest lever in the map
pack, which is the thing Lola sells — so the flagship client can't rank, and
the public dashboard shows a client who hasn't visibly won yet. Fixing this
unblocks the case study, the ranking claims, and the testimonial in one move.

**The engine is already built** — `reviews/` has the SMS sender, the star-tap
flow, a `review_requests` table and an admin UI. It needs credentials, not code.

### Railway

```
TWILIO_ENABLED=true
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1727...        # must be a number you own in Twilio
LOLA_SECRET_ADMIN_KEY=<long random string>   # guards every admin endpoint
```

`reviews/sms.py:26` — `twilio_enabled()` returns false unless `TWILIO_ENABLED`
is the literal string `true`. Setting the SID and token alone does nothing.

Every outbound template already includes "Reply STOP to opt out", which US
carriers require. Don't remove it.

### Then load Sandbar and send

1. Create the business (`reviews/routes.py:194`) — needs `google_review_url`,
   the direct "leave a review" link from their Google Business Profile:

   ```
   POST /reviews/businesses      header: admin key
   { "id": "sandbar", "name": "Sandbar Soft Wash",
     "industry": "soft wash", "google_review_url": "https://g.page/r/..." }
   ```

2. Send one request per past customer (`reviews/routes.py:301`):

   ```
   POST /reviews/request         header: admin key
   { "business_id": "sandbar", "channel": "sms", "customer_phone": "+1727..." }
   ```

   `channel: "email"` works instead if you set `RESEND_API_KEY` and would
   rather not text.

Or use the admin page at `/lp/reviews-admin` if you'd rather click than curl.

**Start with customers you know were happy.** The flow asks for a star rating
first and only routes 4–5 star raters to Google; lower ratings go to private
feedback. That is deliberate and it is why this is safe to send in bulk.

---

## 2 · Take money — Stripe

Right now **every buy button on the site goes to `/apply`, a form.** The site
cannot take a payment.

### Vercel

```
VITE_STRIPE_MONTHLY_URL=https://buy.stripe.com/...
```

Create the Payment Link as:

- **Recurring**, $397/month — *not* one-time. Stripe prices are immutable, so a
  one-time price can't be converted later; you'd rebuild the link.
- **Apple Pay / Google Pay / Link enabled** in the link's settings. On a phone
  that's most of the conversion win and it's a checkbox.
- **Success redirect** to exactly:
  `https://lola.tyalexandermedia.com/start?session_id={CHECKOUT_SESSION_ID}`
  Copy it literally — `{CHECKOUT_SESSION_ID}` is Stripe's placeholder, not
  something you fill in. `/start` already branches on it: a buyer lands on
  "You're in" with the intake link instead of a sales page.

**Redeploy after saving.** `VITE_` vars are compiled in at build time.

### Railway (for webhooks, if you want payment events recorded)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Also: kill the old links

`$197`, `$997` and `$297` are gone from the site, but **Payment Links you
created for them may still be live in your Stripe account.** Anyone holding one
of those URLs can still subscribe at the old price. Deactivate them in Stripe.

---

## 3 · Turn on lead follow-up

`followup/runner.py:90` — the runner is dormant until a provider exists, then
runs on its own (`FOLLOWUP_ENABLED` already defaults to true).

### Railway

```
RESEND_API_KEY=re_...
AUDIT_FROM_EMAIL=ty@tyalexandermedia.com   # must be a verified Resend sender
```

Twilio (section 1) covers the text half. Either provider alone wakes it up;
both gives you text *and* email, which is what the site advertises.

---

## 4 · Make the client dashboard tell the truth

Each of these flips one row of "What's live right now" from pending to live.

```
CALLRAIL_API_KEY=...          # call tracking
CALLRAIL_ACCOUNT_ID=...
GSC_SERVICE_ACCOUNT_JSON=...  # Search Console (one service account, all clients)
BING_WEBMASTER_API_KEY=...    # Bing / Copilot
GOOGLE_OAUTH_CLIENT_ID=...    # Google Business Profile
GOOGLE_OAUTH_CLIENT_SECRET=...
```

GBP is the one that needs Google to approve API access, so start it early — the
approval wait is the long pole, not the wiring.

---

## 5 · Switch on the parts of the site that are built and waiting

All Vercel, all need a redeploy. Each renders **nothing** until set, so there
are no placeholders or broken images in the meantime.

```
VITE_SHOW_SANDBAR_BEFORE_AFTER=true
```
Plus both images. Shoot them the same width and same orientation — a comparison
whose halves are different shapes reads as a trick even when it isn't:
```
frontend/public/images/sandbar-before-wix.jpg
frontend/public/images/sandbar-after-lola.jpg
```

```
VITE_VSL_URL=https://www.youtube.com/watch?v=...
VITE_VSL_POSTER=/images/vsl-poster.jpg
VITE_VSL_UPLOAD_DATE=2026-08-16
```

```
VITE_SHOW_SANDBAR_CASE_STUDY=true
```
Held by D-014 until there are real ranking receipts. Turn it on *after* the
reviews land and Sandbar is actually climbing — not before.

---

## Not set yet, deliberately

`TRIAL_DAYS` in `frontend/src/lib/pricing.ts` is `0`, so no trial copy renders
anywhere. **Only raise it after the Stripe Payment Link has a matching trial
period.** Publishing "14 days free" against a link that charges immediately
breaks the promise in the same session, in front of a card form — the most
expensive place on the site to lose someone.

---

## Order I'd do it in

1. **Twilio** → review engine on → point it at Sandbar's past customers
2. **Stripe link** (~20 min) while the reviews come in
3. **Resend** → follow-up wakes up, email review requests become an option
4. Two weeks later: reviews landed, Sandbar climbing, a testimonial worth
   filming, and a site that can take money
5. Then the before/after images, the VSL, and the case-study flag

Everything in steps 1–3 is account configuration. None of it needs code.
