# New-lead sequence — Sandbar Soft Wash

**Status: PARKED.** Do not load, import, or activate this in GoHighLevel until
BOTH are true:
1. The GHL security incident is closed (see `docs/SECURITY.md` §0b) — Aug-2
   token confirmed dead, sending domains audited, DMARC enforcing.
2. A2P 10DLC registration for the Sandbar sub-account is **approved** — SMS to
   US numbers before that is filtered or blocked by the carriers.

This file exists so the copy is ready and reviewed in advance. It is content
only. It does not touch GHL, sends nothing, and creating it changes no account
state.

---

## What this is

The speed-to-lead sequence that fires when a **new lead** enters the Sandbar
Soft Wash sub-account (quote-request form, ad lead form, or missed-call
text-back). Four messages over three days. The job is one thing: **get the
estimate booked while the lead is still warm** — most exterior-cleaning leads go
cold within the hour, so message 1 goes out in minutes, not the next morning.

This is Sandbar talking to a **homeowner** (B2C), not Coach Ty talking to a
contractor. Voice: warm, fast, local, plain. No hype, no fake urgency.

## Guardrails (same rules as the rest of the system)

- **No fabricated proof.** No invented reviews, star counts, "500+ homes
  cleaned," or awards. If a real review or a real number is used, it goes in a
  merge field the owner fills — never hardcoded here.
- **Every SMS carries an opt-out.** "Reply STOP to opt out" on the first
  message and on any later one that starts a new day. This is A2P law, not a
  nicety.
- **Quiet hours.** No SMS before 8am or after 9pm in the contact's timezone.
  Set this on the GHL workflow, not in the copy.
- **Send from SANDBAR's number and domain** — the client's identity, its A2P
  registration, its verified domain. Never from Coach Ty's or the agency's.
- **Stop on reply.** Any inbound reply or a booked estimate exits the contact
  from the sequence immediately (GHL: "Reply" and "Appointment booked"
  triggers). Nobody gets message 3 after they've already texted back.

## Merge fields used (map these to the sub-account's actual fields)

| token in copy | GHL field |
|---|---|
| `{{first_name}}` | contact first name |
| `{{rep_name}}` | the assigned user / owner's first name |
| `{{property_address}}` | contact address line 1 |
| `{{service}}` | requested service, or "exterior cleaning" as the fallback |
| `{{booking_link}}` | the Sandbar calendar / booking URL (custom value) |
| `{{estimate_window}}` | e.g. "Thursday or Friday morning" — set per week |
| `{{phone}}` | Sandbar's business number |

If a field can be empty, write the line so it still reads right when it is —
"your exterior cleaning" beats "your {{service}}" rendering as "your ."

---

## The four messages

### 1 · SMS — immediately (0–2 min)
> Hi {{first_name}}, it's {{rep_name}} with Sandbar Soft Wash — thanks for
> reaching out about your {{service}}. Is {{property_address}} the property you
> want quoted? Reply with a good time to reach you and I'll get your estimate
> right over. (Reply STOP to opt out.)

*Why: speed is the whole game. A text in the first five minutes outperforms a
polished email an hour later. One question, easy to answer.*

### 2 · Email — +10 min (backstop if the text got no reply)
**Subject:** Your Sandbar Soft Wash estimate

> Hi {{first_name}},
>
> Thanks for reaching out to Sandbar Soft Wash. I'd love to get you a quote for
> your {{service}}.
>
> The fastest way is to grab a time that works for you here:
> {{booking_link}}
>
> Prefer to just talk it through? Call or text me at {{phone}} and we'll sort it
> out in a couple of minutes.
>
> Talk soon,
> {{rep_name}}
> Sandbar Soft Wash

*Why: email carries the booking link and the phone number the SMS kept short.
Same ask, second channel.*

### 3 · SMS — +1 day, only if not booked
> Hi {{first_name}}, {{rep_name}} with Sandbar again — still happy to get you
> that {{service}} quote. I've got a couple of openings {{estimate_window}}.
> Want me to hold one for you? (Reply STOP to opt out.)

*Why: a specific window ("Thursday morning") converts better than an open
"let me know." Makes saying yes a one-word reply.*

### 4 · Email — +3 days, soft close
**Subject:** Should I close out your quote?

> Hi {{first_name}},
>
> I don't want to keep bugging you — if the timing isn't right, no worries at
> all. If you'd still like that {{service}} estimate, just reply to this email
> or text {{phone}} and I'll pick it right back up.
>
> Either way, thanks for thinking of Sandbar.
>
> {{rep_name}}
> Sandbar Soft Wash

*Why: an honest exit outperforms a fifth nudge. It leaves the door open without
pressure, and people reply to "should I close this out?" more than to another
sales push.*

---

## Setup checklist (when un-parked)

1. Confirm A2P 10DLC is **approved** for the Sandbar sub-account.
2. Confirm the sending domain is authenticated for message 2 and 4.
3. Build the workflow in the **Sandbar** sub-account, triggered on new lead.
4. Set quiet hours (8am–9pm contact-local) and STOP handling on the SMS steps.
5. Add exit triggers: any inbound reply, and appointment booked.
6. Map every merge field in the table above to a real field; send yourself one
   live test to your own phone and inbox before enabling the trigger.
7. Enable. Watch the first day of enrollments before walking away.
