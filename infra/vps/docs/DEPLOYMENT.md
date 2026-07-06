# Lola Cloud — Deployment

How code gets from GitHub onto a live client site.

## The one command

```bash
lola-deploy <client-folder>            # e.g. lola-deploy sandbar-soft-wash
lola-deploy travels-by-val "new hero section"   # optional log note
```

What it does, in order (each step self-skips if not applicable):

1. `git pull` in `/opt/lola-cloud/clients/<name>` — fetch the latest code
2. `npm ci` + `npm run build` — only if the project has a `package.json`
3. `pip install -r requirements.txt` into `.venv` — only if Python
4. `pm2 restart <name>` — only if a PM2 app with that name exists
5. `sudo nginx -t && sudo systemctl reload nginx` — config is **tested first**;
   a broken config aborts the reload, so the live site stays up
6. Appends a line to `/opt/lola-cloud/logs/deployments.log`

For a plain HTML site, only steps 1, 5, 6 do anything — deploys take seconds.

**You should see:** green ✔ lines ending in `Deploy of '<name>' complete.`

See deployment history any time:

```bash
tail -20 /opt/lola-cloud/logs/deployments.log
```

## Standing up a NEW client site (checklist)

1. **Repo & folder**
   ```bash
   cd /opt/lola-cloud/clients
   git clone git@github.com:tyalexandermedia/NEW-CLIENT-REPO.git new-client-name
   ```
2. **Nginx** — copy the template, replace `CLIENTDOMAIN`/`CLIENTFOLDER`, enable:
   ```bash
   sudo cp /opt/lola-cloud/infrastructure/vps-setup/nginx/client-site.conf.template \
           /etc/nginx/sites-available/newclientdomain.com
   sudo nano /etc/nginx/sites-available/newclientdomain.com   # do the replacements
   sudo ln -s /etc/nginx/sites-available/newclientdomain.com /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. **DNS** — at the client's registrar:
   ```
   A record   @     YOUR_VPS_IP
   A record   www   YOUR_VPS_IP
   ```
   Wait until `ping newclientdomain.com` shows the VPS IP.
4. **SSL** (free, auto-renews):
   ```bash
   sudo certbot --nginx -d newclientdomain.com -d www.newclientdomain.com
   ```
   Pick "redirect HTTP to HTTPS" when asked. Renewal is automatic
   (`systemctl list-timers | grep certbot` to confirm the timer exists).
5. **Verify:** open `https://newclientdomain.com` in a browser; padlock present.

## Node/Python apps (not static sites)

Run the app under PM2 so it survives crashes and reboots:

```bash
cd /opt/lola-cloud/clients/app-name
pm2 start npm --name app-name -- start          # Node
pm2 start .venv/bin/python --name app-name -- main.py   # Python
pm2 save                                        # remember across reboots
```

Then use the **proxy variant** in the Nginx template (commented block at the
bottom) so Nginx forwards the domain to the app's port. After that,
`lola-deploy app-name` handles restarts automatically.

## Rolling back

Deploys are just git, so rollback is git:

```bash
cd /opt/lola-cloud/clients/<name>
git log --oneline -5                 # find the last good commit
git reset --hard <good-commit>
lola-deploy <name> "rollback"
```

(Then fix forward in the repo — the next `git pull` will fast-forward again.)
