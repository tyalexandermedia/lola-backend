# SECURITY

How Lola handles secrets, verifies inbound webhooks, gates admin access, and
treats lead data. Plain rules, few of them, kept true.

> Living document. Coach Ty can paste over any section with canonical wording.

## Reporting a vulnerability

Email **ty@tyalexandermedia.com** with "SECURITY" in the subject. Include
steps to reproduce and impact. Don't open a public issue for anything
exploitable. Expect an acknowledgement within a few business days.

## Secrets

- **Never commit secrets.** All keys live in Railway (backend) or Vercel
  (`VITE_*` frontend) environment variables. `.env.example` documents names
  and safe defaults only — never real values.
- Rotate a key immediately if it's ever pasted into a PR, log, issue, or
  chat. Treat exposure as compromise.
- The PostHog project key is public-safe (write-only capture) and is the one
  value intentionally shipped as a default.

## Inbound webhook verification

- **Stripe (`POST /stripe/webhook`) fails closed.** It rejects requests when
  `STRIPE_WEBHOOK_SECRET` is unset instead of skipping verification, and uses a
  constant-time HMAC-SHA256 compare (`hmac.compare_digest`) on the
  `Stripe-Signature` header. A money/fulfillment path must never fulfill an
  unverified event.
- **Resend event webhook** verifies its `whsec_` signature when
  `RESEND_WEBHOOK_SECRET` is set.
- **Reply webhook** (`/webhooks/reply`) requires the shared
  `REPLY_WEBHOOK_SECRET` in the `X-Reply-Webhook-Secret` header.
- Business-logic hiccups return `200` so providers don't retry forever;
  **auth/signature failures return `401`** and do no work.

## Admin endpoints

- All admin routes (`/admin/*`, `/followups/*`, `/reviews/*`,
  `/mctb/config/*`, etc.) are gated by `LOLA_SECRET_ADMIN_KEY` via the
  `X-Admin-Key` header. Unset key → those routes are unusable (fail-closed).
- Use a long random value. Never log it, never put it in a URL.

## Outbound automation safety

- Dormant until a provider (Resend/Twilio) is configured.
- Only enrolls leads created **after** deploy — turning a channel on never
  retro-blasts old contacts.
- Advances a step on **attempt**, so a transient failure can't loop resends.
- Buyers are auto-suppressed via the Stripe webhook.
- Every SMS auto-appends **"Reply STOP to opt out."** (`reviews/sms.py`).

## Lead / PII data

- Growth Score leads (name, email, phone, city, service) are stored in SQLite
  on Railway and may be bridged to GoHighLevel and PostHog. Collect only what
  the funnel needs.
- SMS is sent only to leads who provided a phone **and** consented
  (`sms_consent`). Honor STOP/opt-outs.
- Third-party processors: Stripe (payments), Resend (email), Twilio
  (SMS/voice), PostHog (analytics), GoHighLevel (CRM), Anthropic (AI).

## Dependencies

- Keep dependencies patched; review new ones before adding.
- Backend runs on Railway, frontend on Vercel; both over HTTPS only.
