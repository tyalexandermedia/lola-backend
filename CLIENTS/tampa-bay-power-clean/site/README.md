# tampabaypowerclean.com — deployable static site

Rebuild of the Wix site, packaged from the vetted landing page
(`frontend/public/lp/tampa-bay-power-clean.html`) with paths made standalone,
hero image optimized 2.8MB → 352KB, a mobile overflow bug fixed, plus
favicon/robots.txt/sitemap.xml. Quote form is self-contained (opens SMS to
727-712-6281, mailto fallback) — no backend needed.

Per house rules: no fabricated reviews/metrics. The proof section uses only
the real same-house before/after photos.

## Deploy to the VPS (2 minutes)

```bash
# from this repo cloned on the VPS:
cp -r CLIENTS/tampa-bay-power-clean/site/. /opt/lola-cloud/clients/tampa-bay-power-clean/
sudo cp /opt/lola-cloud/infrastructure/vps-setup/nginx/sites/tampabaypowerclean.com.conf /etc/nginx/sites-available/tampabaypowerclean.com
sudo ln -s /etc/nginx/sites-available/tampabaypowerclean.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -H "Host: tampabaypowerclean.com" http://localhost/ | head   # preview before DNS
```

DNS stays on Wix until the new site is approved. Cutover + SSL steps:
`infra/vps/docs/MIGRATION.md`.
