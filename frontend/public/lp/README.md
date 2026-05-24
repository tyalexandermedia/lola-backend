# /lp/ — Industry landing pages (served by Vercel)

These are standalone HTML pages that get deployed by Vite to
`https://lola.tyalexandermedia.com/lp/*.html` (pre-DNS:
`https://lola.tyalexandermedia.com/lp/*.html`).

Vite's static asset handling serves anything in `frontend/public/` at the site
root — these HTML files bypass the React app entirely (no client-side JS to
load, no router, instant render). Perfect for SEO landing pages where TTFB
matters and the React shell is overkill.

## Pages

| Slug | Trade | Case-study framing |
|---|---|---|
| `local-seo-pressure-washing-florida.html` | Soft Wash (FL) | Real (Sandbar) |
| `local-seo-hvac-contractors-tampa.html` | HVAC (Tampa) | Founding client opening |
| `local-seo-roofers-florida.html` | Roofers (FL) | Founding client opening |
| `local-seo-plumbers-tampa.html` | Plumbers (Tampa) | Founding client opening |

## Cold outreach mapping

Email 1 routes each contractor to their industry-matched page:

- Pressure washer → `/lp/local-seo-pressure-washing-florida.html`
- HVAC → `/lp/local-seo-hvac-contractors-tampa.html`
- Roofer → `/lp/local-seo-roofers-florida.html`
- Plumber → `/lp/local-seo-plumbers-tampa.html`

## UTMs

Every CTA on these pages carries:
```
?utm_source=tam&utm_medium=lp&utm_campaign=<slug>
```

So PostHog (when enabled on the React app) tags every downstream event with
the originating LP campaign.

## Updating copy

These pages are self-contained — no shared layout, no template engine, no
build step beyond Vite's copy-public-to-dist. Edit the HTML directly. Each
page is ~14 KB raw, ~6 KB gzipped.

When you update one page's CSS, copy the `<style>` block to the others to
keep them in sync (or extract to `/lp/style.css` and link if you'd rather
share — single-file keeps each page fully self-contained for now).

## Wix iframe (Q1 2026)

The eventual plan is to iframe these Vercel-hosted pages into
`tyalexandermedia.com/*` Wix pages so the brand domain owns the rank. Once
the iframe integration ships, drop the canonical from the LP HTML to point
at the Wix URL.

## Dropped (per v6 spec)

`seo-agency-tampa-fl` — too vague, dilutes positioning. Markdown source
removed from `docs/money_pages/`.
