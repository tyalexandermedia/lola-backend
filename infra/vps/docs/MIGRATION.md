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

## 3. lola-seo (static landing pages)

Clone into `/opt/lola-cloud/seo/lola-seo`. It has an `/api` folder — check
whether those are Vercel serverless functions before cutover; if so they need
a PM2 port + nginx `location /api` proxy, or fold them into lola-backend.
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

The Vercel adapter doesn't run on a VPS. One-time repo change (do this in a
branch first):

```bash
cd /opt/lola-cloud/clients/sandbar-soft-wash
npx astro add node        # installs @astrojs/node, sets adapter in astro.config.mjs
# in astro.config.mjs: remove the vercel adapter import/entry; keep output: 'hybrid'
npm run build             # produces dist/server/entry.mjs
pm2 start dist/server/entry.mjs --name sandbar-soft-wash   # listens on :4321 by default
pm2 save
```

Nginx: use the **proxy variant** of the template pointed at `127.0.0.1:4321`.

**Pre-cutover checklist (non-negotiable — this site takes leads):**
- [ ] `curl -X POST` a test lead to `/api/lead` on the VPS and confirm it lands
      wherever leads go (email/CRM) — check `src/pages/api/lead.ts` for required
      env vars and put them in `.env` on the VPS first
- [ ] `/api/reviews` returns data
- [ ] A dozen key pages render (home, instant-quote, calculator, 2–3 city pages)
- [ ] Only then move DNS; watch `pm2 logs sandbar-soft-wash` during the first hours

## tampabaypowerclean.com (Wix — rebuild, not migrate)

Wix can't be exported. The play: build a new site in
`clients/tampa-bay-power-clean` (start from `lola-new-client` /
`templates/local-business-starter`, reuse sandbar's page structure as the
model since it's the same trade), then cut DNS over when it beats the Wix
site. Until then, leave Wix alone. Note `tyalexandermedia.com` itself is also
on Wix — same treatment, later.
