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

## 1 · Reviews and follow-up run through GoHighLevel

**Decision, Aug 2026: GHL owns all outbound to clients' customers** — review
requests, lead follow-up, missed-call text-back. Lola pushes contacts and tags
*into* GHL; GHL decides what goes out and sends it from the client's own domain
and number.

Two reasons, and the second is the one that actually forced it:

1. A Sandbar customer should never get a review request from
   `tyalexandermedia.com`. They don't know who that is — low opens, high spam
   complaints, and it puts Lola's domain reputation behind someone else's
   campaign.
2. The sending domain was used in an authenticated phishing blast (valid key,
   valid DKIM/SPF) in Aug 2026. Its reputation has no slack left to spend.

### What that means for env vars

**Do NOT set `TWILIO_*` on the backend.** GHL's LC Phone is Twilio underneath —
setting both means one 10DLC registration paying for two senders.

`RESEND_API_KEY` **does** still belong on the backend: `main.py` uses it for
Lola's own audit-confirmation emails to Lola's own leads. That is Lola talking
to its own prospects, which is fine.

```
OUTBOUND_VIA_GHL=true    # the default — no need to set it explicitly
```

`api_clients/ghl.py::outbound_via_ghl()` gates the follow-up runner, the review
SMS sender and the review email sender. It exists because
`RESEND_API_KEY` has to be present anyway, and the follow-up runner wakes the
moment it sees that key — so without the switch, turning on Lola's own
prospecting email would silently start a **second** sender to a client's
customers, duplicating whatever GHL is already sending them.

Verified with credentials present: `twilio_enabled()`, the follow-up runner and
the review email sender all return False, and the email sender returns before
making any network call at all.

Set `OUTBOUND_VIA_GHL=false` only to hand sending back to Lola — and switch the
corresponding GHL workflows off in the same change, or you get the double-send
this switch exists to prevent.

### Building Sandbar's review segment

`services/build_review_segment.py` pulls GHL contacts tagged `customer:past`,
classifies real customers vs directory entries, excludes Email DND /
`exclusion:no-marketing` / `sandbar-optout` / invalid addresses, and tags the
rest `review-send-eligible`. It never sends anything.

```
export GHL_API_TOKEN=pit-...        # fresh Private Integration token
export GHL_LOCATION_ID=...
python3 services/build_review_segment.py           # dry-run, sends nothing
# read reports/review_eligible.csv, sanity-check the names
python3 services/build_review_segment.py --apply   # tags eligible contacts
```

Line 220 halts if the token is still the revoked Aug-2 one, so generate a fresh
Private Integration token rather than reusing an old one. Requires `httpx`.

Then build the review campaign **in GHL**, against the `review-send-eligible`
tag, sending from Sandbar's own domain and number.

## 2 · Take money — Stripe

The live Payment Link now ships in `frontend/src/lib/checkout.ts`. A Payment
Link is a public URL, not a secret, so it belongs in the code; the real Stripe
secrets stay in Railway.

It is now the destination of **every** call-to-action on the site. As of
2026-08-17 the Google Calendar booking link is gone from the product — the
report page, `/work`, `/vs`, `/grader`, `/growth-score`, all 48 `/lp` pages and
the follow-up emails used to point at it, which meant the hottest moment in the
funnel handed people a booking form instead of a way to buy. Nothing reads
`VITE_CALENDAR_URL` or `FOLLOWUP_CALL_URL` any more; delete both from Vercel and
Railway so a future CTA can't quietly reach for a calendar again.

Verify by hand in Stripe — the build environment can't reach it:

- **Recurring** $397/month, not one-time. Stripe prices are immutable, so a
  one-time price can't be converted later.
- Apple Pay / Google Pay / Link enabled.
- Success redirect exactly:
  `https://lola.tyalexandermedia.com/start?session_id={CHECKOUT_SESSION_ID}`
- **Deactivate the old $197 / $997 / $297 links.** They may still be live in
  the account; a bookmarked URL still charges.

Optional, for recording payment events:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 3 · Email hygiene, after the Aug 2026 incident

- Resend API key rotated. ✅
- Tighten DMARC from `p=none` to `p=quarantine; pct=100; adkim=s; aspf=s`, run
  two weeks, then `p=reject`. `p=none` observes and does nothing.
- Remove the `brevo-code` TXT from the root domain if Brevo is unused — it's a
  second authorized sending platform with a second set of credentials.
- Keep Lola's own app mail off the root domain: verify a subdomain in Resend
  and send from it, so the domain running Google Workspace and client
  conversations isn't sharing reputation with an automated script.

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

1. **Build the segment** — run `build_review_segment.py` dry, check the CSV,
   re-run with `--apply`. Nothing sends.
2. **Build the review campaign in GHL** against `review-send-eligible`, sending
   from Sandbar's own domain and number. This is the highest-ROI step in the
   whole document: Sandbar has 0 Google reviews, review count is the biggest
   lever in the map pack, and the public dashboard currently shows a client who
   hasn't visibly won yet.
3. **Verify the Stripe link** (~20 min) while those go out — recurring, wallets
   on, redirect correct, old links killed.
4. **DMARC to `p=quarantine`**, and drop the Brevo TXT if it's unused.
5. Two weeks later: reviews landed, Sandbar climbing, a testimonial worth
   filming, and a site that can take money.
6. Then the before/after images, the VSL, and the case-study flag.

Steps 1–4 are account configuration and one script. None of it needs new code.

**Do not set `TWILIO_*` anywhere** — that would put a second sender in front of
the same customers GHL is already messaging. Earlier drafts of this file said
Twilio first; that was written before outbound moved to GHL.
