# Ready-made site configs (placeholders — enable when DNS is ready)

One config per known domain, pre-filled from `../client-site.conf.template`:

| File | Domain | Serves from |
|---|---|---|
| `lola.tyalexandermedia.com.conf` | lola.tyalexandermedia.com | `/opt/lola-cloud/agents/lola-backend/frontend` (proxy variant commented inside) |
| `sandbarsoftwash.com.conf` | sandbarsoftwash.com | `/opt/lola-cloud/clients/sandbar-soft-wash` |
| `tampabaypowerclean.com.conf` | tampabaypowerclean.com | `/opt/lola-cloud/clients/tampa-bay-power-clean` |
| `travelsbyval.com.conf` | travelsbyval.com | `/opt/lola-cloud/clients/travels-by-val` |

**These are NOT enabled by the setup scripts** — enabling a config for a domain
whose DNS points at a live site elsewhere does nothing harmful (traffic never
arrives), but we still keep it manual so nothing surprises you.

## ⚠️ Current DNS state (checked 2026-07-04)

All four domains are **live on other hosts right now**. Do NOT change DNS for
a domain until its site is built, deployed, and tested on the VPS — moving DNS
is the cutover moment.

| Domain | Currently hosted on |
|---|---|
| sandbarsoftwash.com | Vercel |
| tampabaypowerclean.com | Wix |
| travelsbyval.com | Vercel |
| lola.tyalexandermedia.com | Vercel |

Safe cutover order per site: build on VPS → test via `curl -H "Host: DOMAIN" http://VPS_IP/`
→ lower the DNS TTL to 300 a day ahead → switch the A records → run Certbot
→ verify → keep the old host live a few days as fallback.

## Enable a site (2 commands)

```bash
sudo cp /opt/lola-cloud/infrastructure/vps-setup/nginx/sites/DOMAIN.conf /etc/nginx/sites-available/DOMAIN
sudo ln -s /etc/nginx/sites-available/DOMAIN /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Then add SSL (only after DNS points here)

```bash
sudo certbot --nginx -d DOMAIN -d www.DOMAIN
```

DNS needed first — at your domain registrar add:

```
Type A    Host @      Value <YOUR-VPS-IP>    TTL 300
Type A    Host www    Value <YOUR-VPS-IP>    TTL 300
```

(For `lola.tyalexandermedia.com` it's `Type A, Host lola`, no www record.)
Wait until `ping DOMAIN` shows your VPS IP before running Certbot.
