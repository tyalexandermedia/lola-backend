# Money Pages — Wix Build Guide

5 commercial-intent landing pages for `tyalexandermedia.com`. Each targets warm searchers with high commercial intent. All funnel to Lola.

## Page list

| Slug | Target keyword | File |
|---|---|---|
| `/local-seo-pressure-washing-florida` | local seo pressure washing florida | [01-pressure-washing.md](01-pressure-washing.md) |
| `/local-seo-hvac-contractors-tampa` | local seo hvac contractors tampa | [02-hvac-tampa.md](02-hvac-tampa.md) |
| `/local-seo-roofers-florida` | local seo roofers florida | [03-roofers-florida.md](03-roofers-florida.md) |
| `/local-seo-plumbers-tampa` | local seo plumbers tampa | [04-plumbers-tampa.md](04-plumbers-tampa.md) |
| `/seo-agency-tampa-fl` | seo agency tampa fl | [05-seo-agency-tampa.md](05-seo-agency-tampa.md) |

## How to use these in Wix

For each page in the table above:

1. Wix Dashboard → Pages → **+ Add Page** → blank
2. **Page settings (gear icon)**:
   - URL slug: paste from the table
   - Page title: copy `<title>` line from the .md file
   - Meta description: copy `meta_description` line
   - Open Graph: same content as title/description
3. **Page content**:
   - Use Wix's H1/H2/paragraph blocks
   - Copy sections from the .md file 1:1
   - Buttons → set link to the Lola URL shown in the doc (audit or retainer)
   - All audit links use `?utm_source=tam&utm_medium=landing&utm_campaign=<slug>`
4. **Schema markup**:
   - Wix → Page settings → Advanced SEO → Structured Data
   - Paste the JSON-LD block from the .md file
5. **Internal links**:
   - Each page links to at least 3 others (cross-link block at bottom of every page)
6. **Publish** → run page through Google's [Rich Results Test](https://search.google.com/test/rich-results) to validate schema

## On-page SEO checklist (per page)

- [ ] Title tag under 60 chars
- [ ] Meta description under 155 chars, includes keyword + CTA
- [ ] H1 contains primary keyword
- [ ] H2s use related keywords (semantic SEO)
- [ ] Alt text on every image (keyword-rich, descriptive)
- [ ] LocalBusiness + Service JSON-LD pasted in Advanced SEO
- [ ] 3+ internal links to other money pages or Lola
- [ ] 1-2 external links to authoritative sources
- [ ] Mobile-tested at 375px
- [ ] Lighthouse mobile score ≥ 90

## CTA funnel

```
Money page → Lola audit (?utm_source=tam&utm_medium=landing&utm_campaign=<slug>)
           → Audit email arrives
           → /retainer close page
           → Stripe checkout
```

## Tracking

PostHog auto-captures pageviews. Custom events on Lola side:
- `money_page_viewed` (page slug stored)
- `money_page_cta_clicked` (button label stored)

These fire automatically because all Lola audit links carry UTMs — PostHog parses UTM_source=tam and tags every event in the session.

## Voice guidelines

- Target warm searchers, not cold
- 800–1,200 words per page
- Single primary CTA repeated 3 times (above fold, mid, end)
- Contractor-fluent voice — no SEO jargon
- Lead with revenue framing, not feature lists
- Use "we" not "I" on TAM pages (Lola pages use "I" = Coach Ty)
