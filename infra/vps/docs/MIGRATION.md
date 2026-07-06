# Lola Cloud — Site-by-Site Migration Plan

Each current property, what it runs on today (audited 2026-07-04), and the
exact path to move it onto the VPS. **Order matters** — start with the
lowest-risk site to build confidence, finish with the ones that have live
lead flow.

| # | Site | Stack (audited from repo) | Currently on | Risk |
|---|---|---|---|---|
| 1 | travelsbyval.com | Plain static HTML (`index.html`, prebuilt `destinations/`) | Vercel | Low — easiest first move |
| 2 | randy-golden-mediation | Plain static HTML (single page) | Vercel | Low |
| 3 | lola-seo | Plain static HTML (many landing folders + `/api`) | (check Vercel/Pages) | Low-medium |
| 4 | lola-backend → lola.tyalexandermedia.com | Python FastAPI + uvicorn (Procfile/nixpacks = Railway-style host) | Vercel/Railway | Medium — needs `.env` secrets moved |
| 5 | sandbarsoftwash.com | **Astro 4, `output: 'hybrid'`, Vercel adapter, live API routes (`/api/lead`, `/api/reviews`)** | Vercel | **Highest — /api/lead is live lead capture. Migrate last, test hardest.** |
| — | tampabaypowerclean.com | Wix (no repo yet) | Wix | Rebuild, don't migrate — see below |

General rule for every cutover: build on VPS → test with
`curl -H "Host: DOMAIN" http://VPS_IP/` → lower DNS TTL to 300 a day ahead →
switch A records → `sudo certbot --nginx -d DOMAIN -d www.DOMAIN` → verify →
leave the old host running for a few days as fallback.

---

## 1. travelsbyval.com (static — the practice run)

```bash
cd /opt/lola-cloud/clients
git clone git@github.com:tyalexandermedia/travelsbyval.git travels-by-val
sudo cp /opt/lola-cloud/infrastructure/vps-setup/nginx/sites/travelsbyval.com.conf /etc/nginx/sites-available/travelsbyval.com
sudo ln -s /etc/nginx/sites-available/travelsbyval.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -H "Host: travelsbyval.com" http://localhost/ | head   # should show the homepage HTML
```

Then DNS cutover + Certbot per the general rule. Note: `build-destinations.js`
regenerates destination pages — run `node build-destinations.js` after content
changes, commit the output.

## 2. randy-golden-mediation (static)

Same as #1: clone into `clients/randy-golden-mediation`, copy the template
nginx config (`client-site.conf.template`, replace CLIENTDOMAIN/CLIENTFOLDER
with the real domain once known). The repo's `vercel.json` is ignored on the
VPS — harmless.

## 3. lola-seo (static landing pages + serverless functions)

Clone into `/opt/lola-cloud/seo/lola-seo`. **Audited:** the `/api` folder IS
Vercel serverless functions (`module.exports = (req, res)` style):
`capture-lead.js` (lead emails via Resend), `purchase-intent.js`,
`ig-profile.js`. On the VPS these need a small Express wrapper under PM2 with
an nginx `location /api` proxy — or fold them into lola-backend's FastAPI.
They require `RESEND_API_KEY` as an env var (never hardcoded — a previously
committed key was removed 2026-07-05 and must stay rotated).
Serve under a subdomain (e.g. `seo.tyalexandermedia.com`) when ready.

## 4. lola-backend (FastAPI app → lola.tyalexandermedia.com)

```bash
cd /opt/lola-cloud/agents/lola-backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
# Secrets: copy the env vars from the current host's dashboard into .env (chmod 600). NEVER commit it.
pm2 start ".venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000" --name lola-backend
pm2 save
```

Then enable `nginx/sites/lola.tyalexandermedia.com.conf` using its **proxy
variant** (commented block at the bottom of the file, port 8000). Binding
uvicorn to 127.0.0.1 keeps the app reachable only through Nginx.

## 5. sandbarsoftwash.com (Astro hybrid — the careful one)

**Already done (2026-07-05, branch `claude/lola-cloud-vps-setup-k8cnhr`):**
the repo now has a dual adapter — the default build still targets Vercel
(live site unaffected), and `DEPLOY_TARGET=vps npm run build` produces a
standalone Node server. Both builds verified; the VPS server was smoke-tested
(pages 200, `/api/reviews` 200, `/api/lead` validates input). Merge that
branch, then on the VPS:

```bash
cd /opt/lola-cloud/clients/sandbar-soft-wash
npm ci
# Required env vars (from the Vercel dashboard) into .env, chmod 600:
#   RESEND_API_KEY        (lead emails — /api/lead)
#   GOOGLE_MAPS_API_KEY   (reviews — /api/reviews)
DEPLOY_TARGET=vps npm run build             # produces dist/server/entry.mjs
pm2 start "env $(cat .env | xargs) HOST=127.0.0.1 PORT=4321 node dist/server/entry.mjs" --name sandbar-soft-wash
pm2 save
```

Nginx: use the **proxy variant** of the template pointed at `127.0.0.1:4321`.

**Pre-cutover checklist (non-negotiable — this site takes leads):**
- [ ] `curl -X POST` a REAL test lead to `/api/lead` on the VPS and confirm the
      email arrives at ty@tyalexandermedia.com
- [ ] `/api/reviews` returns live data (needs GOOGLE_MAPS_API_KEY set)
- [ ] A dozen key pages render (home, instant-quote, calculator, 2–3 city pages)
- [ ] Only then move DNS; watch `pm2 logs sandbar-soft-wash` during the first hours

## tampabaypowerclean.com (Wix — rebuild, not migrate)

Wix can't be exported. **The rebuild is DONE (2026-07-05):** a deployable
static site lives at `CLIENTS/tampa-bay-power-clean/site/` in this repo —
built from the vetted landing page copy (roof cleaning/house washing,
Dunedin + Pinellas), full schema (business/FAQ/services), real before-after
proof photos, optimized hero (352KB), self-contained SMS quote form
(727-712-6281), favicon/robots/sitemap. Verified rendering at 390px and
1280px; a mobile overflow bug in the source page was fixed. Deploy steps are
in that folder's README; DNS stays on Wix until Ty approves the new site.
Note `tyalexandermedia.com` itself is also on Wix — same treatment, later.
