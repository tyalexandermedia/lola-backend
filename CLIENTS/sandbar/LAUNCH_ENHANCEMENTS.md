# Sandbar SoftWash — Launch Enhancements (QA lane drafts — FLAGGED, not live)

> Status: **DRAFTS for ops-lane review.** Nothing here is loaded into GHL or scheduled.
> These fill the four highest-ROI gaps found in the launch QA pass. Voice: plain-spoken,
> contractor-fluent, no jargon (per `docs/COWORK_BRIEF.md`). Every SMS ends with
> "Reply STOP to opt out." — GHL does NOT auto-append it the way `reviews/sms.py` does,
> so the line is written into each SMS body below. Do not remove it.

---

## 1. One-time Review-Request send (fires once, after import lands)

**Audience:** contacts tagged `sandbar-customer` **minus** anyone with Email DND /
SMS DND / Email Opt-Out (the 16 opt-outs must be excluded from BOTH channels — in GHL,
build the smart list as `tag = sandbar-customer AND DND is none`).
**Cadence:** one send, SMS first; email only to contacts with no mobile number
(don't double-tap the same person the same day).
**Guardrail:** this is a one-time broadcast, NOT enrollment in the ongoing
Review Request automation — don't add these contacts to any workflow.
**Reuses:** the same ask + link pattern as `reviews/sms.py::send_sms_review_request`
(existing asset — kept consistent, not duplicated).

### SMS (per-contact, use GHL first-name merge)

```
Hi {{contact.first_name}}, it's the crew at Sandbar SoftWash. Thanks for
trusting us with your home — it means a lot to a local family business.
Would you take 30 seconds to share how we did? Your review helps neighbors
find us: {{review_link}}

Reply STOP to opt out.
```

(~300 chars, 2 segments. `{{review_link}}` = the REAL Sandbar GBP review link —
the profile is claimed. Use a short link that redirects to:
`https://search.google.com/local/writereview?placeid=ChIJB8P9dJ7xwogR_spdA8pO63k`
Gate cleared: the GBP claim is done, so this send is unblocked once the GBP→GHL
integration is connected (Settings → Integrations → Google Business Profile,
inside the Sandbar SoftWash sub-account, using the Google login that owns the GBP).)

### Email (subject + body)

**Subject:** How did we do, {{contact.first_name}}?

```
Hi {{contact.first_name}},

Thanks for choosing Sandbar SoftWash — whether it was your roof, your
driveway, or the whole house, we appreciate you trusting a local crew
with it.

Quick favor: would you leave us a short review on Google? It takes about
30 seconds, and it's the single biggest way neighbors in Palm Harbor and
Pinellas find us.

→ {{review_link}}

If anything wasn't right, just reply to this email — it comes straight
to us and we'll make it right first.

— The Sandbar SoftWash crew
```

(The "reply if something was wrong" line routes unhappy customers to a
conversation instead of a public 1-star — same feedback-first pattern as the
existing review-capture module.)

---

## 2. Past-customer reactivation sequence (3 touches, records → revenue)

**Audience:** same `sandbar-customer` smart list, DND-excluded. **Start AFTER the
review send has run** (7+ days later) so the first thing past customers hear is a
thank-you, not a pitch.
**Guardrail:** every SMS ends with the STOP line; email touches send only to
non-opt-outs; no pipeline enrollment — a reply moves them manually (or via the
existing Speed-to-Lead automation once they respond).

### Touch 1 — SMS, Day 0 (seasonal hook)

```
Hi {{contact.first_name}}, Sandbar SoftWash here. Florida summer is rough
on roofs and driveways — if yours is due for a wash, past customers get
first pick of this month's schedule. Want a quick quote? Just reply YES.

Reply STOP to opt out.
```

### Touch 2 — Email, Day 4

**Subject:** Your place due for a wash?

```
Hi {{contact.first_name}},

It's been a while since we cleaned for you — and in this climate, algae
and grime don't wait. A maintenance wash now costs a lot less than a
restoration job later.

Because you're a past customer, you skip the line: reply to this email
or call/text {{location.phone}} and we'll get you on the schedule this
week.

— Sandbar SoftWash
```

### Touch 3 — SMS, Day 10 (last touch, soft close)

```
{{contact.first_name}}, last note from Sandbar SoftWash — we're filling
next week's washing schedule and wanted to offer past customers first
shot. Reply YES for a fast quote, or save this number for when you're
ready.

Reply STOP to opt out.
```

**Stop condition:** any reply exits the sequence immediately (GHL "remove from
workflow on reply").

---

## 3. Week-1 content calendar (from the 12-piece Pressure Washing pack)

The 12-piece pack lives with the ops lane — this calendar assigns slots; ops drops
in the matching piece. Channels: GBP posts (primary — feeds the just-claimed
profile), Facebook, Instagram. All local-proof, no invented stats.

| Day | Channel(s) | Slot | Piece from pack |
|---|---|---|---|
| Day 1 (launch) | GBP + FB + IG | Announcement — "Sandbar SoftWash is on Google" + claimed profile, real photo | Launch post #1 (already drafted by ops — verify, don't redo) |
| Day 2 | GBP | Service spotlight: roof soft-wash (before/after, real job photo) | Pack: roof cleaning piece |
| Day 3 | FB + IG | Educational: "Why soft wash instead of pressure on shingles" | Pack: soft-wash-vs-pressure piece |
| Day 4 | GBP | Service-area post: Palm Harbor / Dunedin / Tarpon Springs | Pack: service-area piece |
| Day 5 | FB + IG | Owner/crew intro — local family business, faces build trust | Pack: about/crew piece |
| Day 6 | GBP | Offer post: free quote CTA with tracked phone number | Pack: quote CTA piece |
| Day 7 | FB + IG + GBP | First-review celebration (ONLY if a real review has landed — never fabricate; skip and slide the calendar if not yet) | Pack: social-proof piece |

Rules: every GBP post gets a photo + CTA button; reuse real Sandbar job photos only;
no ranking claims ("#1", "best in Tampa") anywhere — the blueprint's proof standard
(`BLUEPRINTS/pressure-washing/blueprint.json`) allows verified claims only.

---

## 4. Seeded GBP Q&A (owner-posted, 8 items)

Post from the owner account after the GBP claim verifies. These are real
answers to real buying questions — factual, no invented stats.

1. **Q: What areas do you serve?** A: We're based in Palm Harbor and serve
   Pinellas County and the Tampa Bay area — including Dunedin, Tarpon Springs,
   Holiday, Clearwater, and Tampa.
2. **Q: Do you use soft washing or pressure washing?** A: Both, depending on the
   surface. Roofs and painted surfaces get low-pressure soft washing (it kills the
   algae without damaging shingles); concrete and pavers get pressure washing.
3. **Q: Is soft washing safe for my roof?** A: Yes — it's the method shingle
   manufacturers recommend. High pressure can strip granules off shingles; soft
   washing cleans with treatment solutions at low pressure.
4. **Q: How do I get a quote?** A: Call or text us, or request a quote through our
   website — most quotes are same-day, and we can often quote from a photo.
5. **Q: How long does a house wash take?** A: Most single-family homes take 2–4
   hours depending on size and buildup.
6. **Q: How often should I have my roof cleaned in Florida?** A: In our climate,
   every 2–3 years keeps algae from taking hold — sooner if you see black streaks.
7. **Q: Are you licensed and insured?** A: Yes — fully insured. Happy to provide
   proof of insurance with your quote.
8. **Q: Do you offer paver sealing?** A: Yes — cleaning and sealing, which keeps
   pavers looking new and makes the next cleaning easier.

*(Ops: verify #7 wording against actual license/insurance status before posting —
never post a compliance claim that isn't literally true.)*
