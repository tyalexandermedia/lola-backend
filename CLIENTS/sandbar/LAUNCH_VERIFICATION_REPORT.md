# Sandbar SoftWash — Launch Verification Report (QA lane)

Date: 2026-07-12 · Scope: independent verification of the eng + ops lanes against the
launch guardrail contract. Evidence-based; both repos audited at HEAD == origin/main.

## Verdict: **CONDITIONAL GO**

Sandbar can go live tonight on the ops side (import + GHL + GBP) once the three
environment fixes land. **Hold two Lola marketing surfaces** — the Sandbar case-study
page and cold-outreach Variants C/E — until the proof-claim and "audit"-wording
failures below are patched (eng, ~1 hour total).

---

## 1. Guardrail audit

| Guardrail | Verdict | Evidence |
|---|---|---|
| Import is records-only, no workflow/campaign/pipeline enrollment | **PASS** | `scripts/ghl_import_contacts.py` (on main): only `POST /contacts/upsert`; dry-run default; resume log; 429 backoff. Growth-score pipeline lives in a separate, never-called path (`api_clients/ghl.py`) — imported customers cannot be auto-enrolled or tagged `growth-score`. |
| Opt-outs → Email DND | **PASS** | Importer sets `dndSettings.Email.status=active` for Email Opt-Out=true rows. Caveat: tags are CSV-driven — `sandbar-customer` must be in the CSV (it is, per the cleaned-CSV verification); the 5-contact read-back step in the finalize run confirms it live. |
| Every SMS ends "Reply STOP to opt out." | **PASS (backend) / VERIFY (GHL)** | Backend transport auto-appends it (`reviews/sms.py:39-41,73`) on all 8 SMS templates. **This does NOT cover SMS built inside GHL** — the 3 GHL automations (Speed-to-Lead, Missed-Call Text-Back, Review Request) need the line written into each message body. Ops must verify in the GHL UI. |
| "Growth Score", never "audit" (public copy) | **FAIL** | Customer-facing: `frontend/src/SandbarCaseStudy.tsx:194-196`; `Homepage.tsx:198,402`; `GrowthScore.tsx:58`; `SharedReport.tsx:56,61,69`; `outreach/templates.py:127` (Variant E); lola-seo `roadmap/index.html:408` ("Deep audit" footer link). Also the April Drive PDF is titled "FREE LOCAL SEO AUDIT" — historical; do not re-send it. |
| No fabricated proof | **FAIL** | "5 keywords ranked in 3 weeks" + "More 5-star reviews" stated as fact (`SandbarCaseStudy.tsx:36,45,104-125,214,249-257`; `outreach/templates.py:72-73` Variant C; mirrored on lola-seo home + all 22 vertical pages via `tools/gen_pages.py:135,212`) — while the measurement doc (`docs/case-studies/sandbar-roof-cleaning-optimization.md`) is "in progress" with blank day-0/day-30 tables, and Sandbar has 0 reviews. `client.json` "verified_*_wins" carry no dates/evidence. Substantiate with snapshot receipts or soften to documented-only claims. |
| Public pricing two-tier ($197/$997 one-time) | **PASS** | Both repos: only $197/$997 visible; no legacy tiers. Dead "$400 RETAINER" CSS in lola-seo `style.css:837-849` (unused — delete). |
| Monthly retainer nurture/email-only, never public | **PASS + DECISION NEEDED** | Off /pricing, nav, sitemap (by design; `/managed` is the intentional nurture destination). **But the price is inconsistent: $299/mo** in canonical `docs/PRICING.md` + `db/pricing.py:33` **vs $297/mo** in the live nurture default (`followup/runner.py:74`), GO-LIVE, COWORK_BRIEF, ROADMAP, CLIENT_ONBOARDING. Customers would be quoted $297 while the SoT says $299. Pick one before the Stripe Managed link is created (recommend $297 — it's what every operational doc and the funnel language use; update PRICING.md + db/pricing.py). |
| /lp/* untouched | **PASS** | No lp files changed; both repos HEAD identical to origin/main. |
| Nothing "live" until merged to main | **PASS** | Both repos: working branches are identical to origin/main; the importer landed via merged PR. Nothing is stranded unmerged. |

## 2. Completeness (the 5 in-flight launch items)

| Item | Status | Notes |
|---|---|---|
| 471-contact import → new GHL sub-account | **BLOCKED (env)** | Code DONE on main. This container has: no `GHL_API_TOKEN`/`GHL_LOCATION_ID` injected, proxy 403 on `services.leadconnectorhq.com` (allowlist step never done), no CSV attached. Fix = 2 environment settings + fresh session with CSV. Also verify `GHL_LOCATION_ID` is the NEW sub-account's ID. |
| Governance docs on lola-backend | **DONE** | DECISIONS/SECURITY/ROADMAP/CLIENT_ONBOARDING all on origin/main (commit `05d05c67`). |
| GHL build: pipeline, calendar, 3 automations, Conversation AI | **PENDING — verify in GHL** | Not verifiable from the repos (lives in the GHL UI, ops lane). Verification list: each automation live-tested; every SMS body ends with the STOP line; Review Request automation does NOT auto-enroll the imported `sandbar-customer` list. |
| GBP claim + optimize | **PENDING — ops** | No evidence source reachable from this lane. Gates: the review-request send (needs the GBP review link), GBP Q&A seeding, day-1 of the content calendar. |
| 3 launch social posts | **PENDING — ops** | Not in either repo, Drive, or Gmail — presumed in the ops lane's working thread. Confirm they exist before tonight. |

Runsheet note: no documents named "Ship-Tonight runsheet" / "Sandbar GHL setup sheet" /
"import runbook" exist in any reachable source (repos, Drive, Gmail). The de-facto
runbooks are `docs/GO-LIVE.md`, `docs/COWORK_BRIEF.md`, `CLIENT_ONBOARDING.md`, and the
importer's docstring. `TOMORROW.md` and `HANDOFF.md` are stale (May) — archive or refresh.

## 3. Gap list (ranked by ROI)

1. **Ty (2 min):** Environment → allow `services.leadconnectorhq.com` + confirm both GHL
   secrets; start fresh session with CSV attached → unblocks the 471-contact import.
2. **Ty (1 min):** Confirm `GHL_LOCATION_ID` is the NEW Sandbar sub-account ID (from the
   sub-account URL) — wrong ID lands 471 contacts in the wrong location.
3. **Eng (~30 min):** Fix proof claims — `SandbarCaseStudy.tsx`, outreach Variant C,
   lola-seo proof blocks (`tools/gen_pages.py` + regenerate) — or attach receipts.
4. **Eng (~20 min):** "audit" → Growth Score wording sweep (files in §1).
5. **Ty decision + eng (5 min):** retainer price $297 vs $299 — reconcile before the
   Stripe Managed link exists.
6. **Ops:** verify STOP line on all GHL-side SMS; confirm no auto-enrollment of the
   imported list.
7. **Ops:** GBP claim status → then fire the one-time review-request send
   (drafts ready in `LAUNCH_ENHANCEMENTS.md`, DND-excluded, STOP-compliant).
8. **Ops:** confirm the 3 launch posts; week-1 calendar + 8 GBP Q&A drafted and ready.
9. **Eng (cleanup, non-blocking):** delete dead $400-retainer CSS; add dates/evidence to
   `client.json` verified wins; archive stale TOMORROW.md/HANDOFF.md.
10. **Ty (after import):** delete BOTH GHL Private Integrations — the original
    `pit-fe93dc05…` token was pasted into chat transcripts and is burned regardless.

## 4. Enhancements delivered (flagged drafts, not live)

`CLIENTS/sandbar/LAUNCH_ENHANCEMENTS.md` — one-time review-request send (SMS + email,
opt-outs excluded both channels), 3-touch reactivation sequence, week-1 content calendar
mapped to the 12-piece pack, 8 seeded GBP Q&A. Nothing loaded into GHL; ops reviews first.
