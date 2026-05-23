# Lola voice — single source of truth

This file is the canonical copy bank for everything Lola says. The backend,
the frontend, and any future agent (email sequencer, in-app coach, SMS
follow-up) all pull from this list. If you change a line here, change it
*only* here.

**Voice rules:**
- Direct, outcome-focused, playful but never silly.
- Phase 1 audience: home services contractors (soft wash, roofing, HVAC,
  plumbing, pest, landscaping). They are busy. They want to know what's
  bleeding revenue and what to fix first.
- A dog metaphor (sniff, fetch, leash, paw) is OK once per surface. Two in
  the same screen is too many.
- No fake urgency, no FOMO, no "you won't believe…".
- One sentence beats two. Two sentences beat a paragraph.

---

## Question prompts (frontend audit flow)

1. **Business name** — "First thing: what business are we sniffing out?"
2. **Service specialization** — "What do you actually do for a living?"
3. **City** — "Where are the trucks rolling? One city is enough."
4. **Website** — "Drop your site link. Lola's about to crawl it."
5. **Email** — "Where should the report land? Same inbox you check before coffee."

## Between-step transitions

6. After business name — "Got it. {business_name} — locked in."
7. After service type — "{service} in {city}. Niche-mode engaged."
8. After city — "Local turf set. Lola knows where to look."
9. After website — "Site captured. One more thing and we're off-leash."
10. Before submit — "Last step. Then Lola starts digging."

## Sniffing / loading

11. "Lola's nose is on the ground. Give her a few seconds."
12. "Crawling the site, scanning Google, sniffing for leaks."
13. "Checking page speed. Then reviews. Then competitors."
14. "Almost done. Pulling the receipts."

## Result framing — by segment

### Urgent (score < 60)

15. "Heads up: the leaks are real and they're loud. Three fixes get you back in the game."
16. "Your site is leaking customers. Good news — most of this is fixable in a week."
17. "Money is walking past your front door. Here's where to stand."

### Education (score 60-79)

18. "Solid bones, but you're not winning the room. A few targeted moves turn this into a lead machine."
19. "You're close. Three sharp fixes and you're outranking your loudest competitor."
20. "The foundation is there. Now we get aggressive on the parts Google actually rewards."

### Optimization (score 80+)

21. "Top tier already. Now we tighten the bolts and stretch the lead."
22. "You're winning. Time to lap the field."
23. "The basics are clean. Phase two is squeezing every extra call out of the page."

## Lead temperature (internal — used in Brevo + admin UI)

24. **hot** — "Big pain, real budget, ready for a call."
25. **warm** — "Pain is real but not screaming. Educate, then close."
26. **cool** — "Curious, not urgent. Drip them weekly."
27. **cold** — "Already squared away. Quarterly check-in only."

## Generic short lines (CTAs, micro-copy)

28. "Lola's the audit. The plan is human." (footer)
29. "One niche. One clear answer. No fluff." (subtitle)
30. "We only audit home services. That's the whole point." (about line)

## Upsell — post-audit CTA

31. **Headline (when leak > 0):** "Want Lola to plug the ${leak}/mo leak?"
32. **Headline (when audit is incomplete):** "Want Lola to run the playbook for {business_name}?"
33. **Body:** "Phase 1 audit is free. Phase 2 is us actually doing the work — review pushes, GBP fixes, page-speed tunes — for a flat monthly. Book 15 minutes and see if it fits."
34. **Primary button:** "Book a 15-min call →"
35. **Secondary button:** "Email me a custom plan"
36. **Footnote:** "Lola showed you the playbook. We just run it for you — flat fee, month-to-month."

## Audit-incomplete framing

37. "Lola couldn't get enough signal to grade {business_name} fairly — Google's APIs are quiet on this run. The playbook below is the safe-bet starting point."
38. "Audit ran with degraded data. Once the data is flowing again, Lola can grade the real score."
