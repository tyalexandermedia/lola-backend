# Lola Cloud — Client Onboarding

The repeatable process for putting a new client on Lola Cloud infrastructure.
Target time once practiced: **under 30 minutes** (plus DNS wait).

## 0. Gather from the client

- [ ] Domain name + registrar login (or have them add DNS records themselves)
- [ ] Brand assets → save to `/opt/lola-cloud/assets/<client>/`
- [ ] Business info (name, address, phone, hours) for local SEO schema

## 1. Repo

Create a GitHub repo (private) named after the client, ideally by copying a
template repo, then:

```bash
cd /opt/lola-cloud/clients
git clone git@github.com:tyalexandermedia/CLIENT-REPO.git client-name
```

Naming convention: folder = `kebab-case` business name
(`sandbar-soft-wash`, `tampa-bay-power-clean`).

## 2. Build the site

Work in VS Code Remote SSH (`ssh lola-cloud`, open `/opt/lola-cloud`).
Start from `/opt/lola-cloud/templates/` when a fitting template exists —
copy it in, customize, commit, push. The repo is the source of truth;
the VPS folder is the deploy target.

## 3. Nginx + DNS + SSL

Follow the "Standing up a NEW client site" checklist in
[DEPLOYMENT.md](DEPLOYMENT.md) — template copy, DNS A records, Certbot.

## 4. SEO baseline

- [ ] `title` / meta description on every page
- [ ] LocalBusiness schema (JSON-LD) with the business info from step 0
- [ ] Google Business Profile linked to the new domain
- [ ] `sitemap.xml` + `robots.txt` present
- [ ] Submit to Google Search Console
- [ ] Record the site in `/opt/lola-cloud/seo/` tracking

## 5. Wire into operations

- [ ] First deploy: `lola-deploy client-name "initial launch"`
- [ ] Backup includes it automatically (everything under `clients/` is covered)
- [ ] Add client to `/opt/lola-cloud/reports/` reporting cadence
- [ ] If the client has automations/CRM: `/opt/lola-cloud/automation/<client>/`

## 6. Launch QA

- [ ] `https://` loads with padlock, `http://` redirects
- [ ] Mobile rendering checked (real phone, not just devtools)
- [ ] Forms/CTAs actually deliver (test submission)
- [ ] Lighthouse: performance + SEO ≥ 90
- [ ] `lola-health` still all green

## Offboarding (if a client leaves)

1. `lola-backup` (final snapshot including their folder)
2. Hand over: zip of their site + transfer the GitHub repo if agreed
3. Disable the site: `sudo rm /etc/nginx/sites-enabled/theirdomain.com && sudo systemctl reload nginx`
   (the config in `sites-available` and the folder stay until you delete them deliberately)
