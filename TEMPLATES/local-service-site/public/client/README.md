# public/client — client-owned assets

Everything in this folder belongs to the client. The master ships only clearly
labelled EXAMPLE placeholders here; `npm run setup-site` removes them.

Put here:

- `logo.svg` or `logo.png` (referenced from `config/brand.json` → `logo`)
- `hero.jpg` — optional, under 400 KB, 1600px wide is plenty
- `og.jpg` — optional share image, 1200×630
- before/after pairs named `<job>-before.jpg` / `<job>-after.jpg`, same angle, under 200 KB each

Never put here: stock photos presented as the client's work, images with
third-party watermarks, or anything the client has not approved.
