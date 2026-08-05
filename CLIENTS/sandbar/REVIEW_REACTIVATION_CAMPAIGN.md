# Sandbar SoftWash — Review + Reactivation Campaign (CANONICAL, FINAL)

Email-only. Audience: ~41 contacts tagged `review-send-eligible` (real past
customers, valid email, opt-outs/DND excluded). Two workflows, sequenced,
never combined. SMS off until A2P (phone-only ~51 = second wave post-A2P).

## Guardrails (non-negotiable)

- Review ask carries NO incentive (Google prohibits incentivized reviews;
  FTC deceptive-review rule). Discount lives ONLY in Email 2, never tied to
  a review.
- No review gating (no 1–3★ private / 4–5★ Google split — Google + FTC
  violation). Everyone gets the Google link + a private "reply if anything
  was off" path.
- Every email: working unsubscribe + business name/address (CAN-SPAM).
  Reply-to = team@sandbarsoftwash.com.
- Records-only build; publish only after the owner inbox check passes
  (footer, mobile, links, reply routing).
- Opt-outs / Email-DND always excluded. One-time, no re-blast.

## Custom values

- `google_review_url` =
  https://search.google.com/local/writereview?placeid=ChIJB8P9dJ7xwogR_spdA8pO63k
- `booking_url` = Sandbar "Book My Free Quote" calendar link
- 10% offer: internal note/coupon so the crew honors it; no code in-email.

## WORKFLOW A — "Review Request (one-time)"

Trigger: Contact Tag Added = `review-send-eligible` · Filters: email
present, not Email-DND, NOT `exclusion:no-marketing`, NOT `sandbar-optout`
· Channel: EMAIL ONLY · Stop-on-response ON · send immediately.

```
Subject: Keeping your place fresh, {{contact.first_name}} — a couple quick tips

Hi {{contact.first_name}},

Thank you again for trusting Sandbar SoftWash with your property. Now that it's looking its best, here are a few simple ways to keep it that way:

- Algae and mildew return fastest on shaded, north-facing surfaces — a light rinse every couple of months slows it down considerably.
- Keep gutters and downspouts clear so runoff doesn't streak your siding or walkways.
- Trim back anything touching the house — those contact points are where growth tends to start.

When it's time for your next refresh, we're glad to reach out so it never gets away from you — just reply "schedule me" and we'll make sure you get first pick of the calendar.

And if we did right by you, a quick Google review would mean a great deal. It's how your Tampa neighbors find a local crew they can trust:

👉 {{custom_values.google_review_url}}

If anything wasn't perfect, simply reply and let us know — we'll make it right.

Warmly,
The Sandbar SoftWash Crew
```

(Footer: unsubscribe + business name/address. NO discount anywhere.)

## WORKFLOW B — "Reactivation + 10% (one-time)"

Trigger: Contact Tag Added = `review-send-eligible` · same four exclusions
· Channel: EMAIL ONLY · Stop-on-response ON · Delay: WAIT 6 DAYS after
enroll, then send · Exit on reply / booking / opt-out.

```
Subject: Time for a refresh, {{contact.first_name}}? 10% off through [DATE]

Hi {{contact.first_name}},

It's the crew at Sandbar SoftWash checking in. Here in Florida, algae and grime tend to creep back within a year or two — and summer humidity is when it really accelerates. If your roof, siding, or driveway is starting to show it, now's the ideal time to get ahead of it, before the busy season fills the calendar.

As a thank-you for being a valued past customer, we'd like to offer you 10% off your next cleaning — roof, house, driveway, pool deck, whatever needs attention. It's yours through [DATE]:

👉 Book in about a minute: {{custom_values.booking_url}}

Or simply reply "book me," and we'll find a time that works and confirm the details with you.

We'd be glad to have you back on the schedule.

Warmly,
The Sandbar SoftWash Crew
```

(Footer: unsubscribe + business info. [DATE] = 10–14 days out, set at
publish time.)

## Publish sequence (owner, after inbox check)

> ⚠️ ORDER MATTERS — publish BEFORE tagging. Both workflows trigger on
> **Contact Tag Added**, which fires on the tag EVENT, not tag state. If
> the Railway `--apply` run tags the 41 while A/B are unpublished, the
> trigger never fires for them. Publish A and B first, then run `--apply`.
> (If the tag was already applied early: remove + re-add the tag, or enroll
> the tagged contacts via bulk action.)

1. Confirm both emails render (mobile, links, unsubscribe footer) + a reply
   lands in team@sandbarsoftwash.com.
2. Publish Workflow A and Workflow B (B is safe to publish alongside A —
   its 6-day wait sequences it).
3. Run Railway `--apply` (tags the ~41) → confirm ~41 enroll in A (matches
   the `--apply` count), review email sends, 0 to directory, 0 SMS.
4. Verify B's enrollment matches A; B fires automatically 6 days behind.

**Domain dependency:** until ticket #GHL-6047925 activates
`mail.sandbarsoftwash.com`, sends go out on the shared msgsndrflow fallback
domain (which passed the Aug-2 inbox seed). Owner call: launch on the
fallback, or hold publish until the dedicated domain is active and a fresh
seed passes.

## Later (not now)

- Maintenance-plan upsell (recurring 6–12 mo) as a 3rd touch once this
  proves out.
- Go-forward: capture before/after photo on every job → future review
  emails show the customer their own result (highest-converting review ask).
- Phone-only wave (~51) mirrors this sequence via SMS post-A2P.
