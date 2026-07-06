# Lola Cloud — VPS Setup Guide

The complete, copy-paste walkthrough for setting up (or rebuilding) the Lola
Cloud VPS. Written so you can follow it start-to-finish without prior server
experience.

**What you need before starting:**

| Item | Example |
|---|---|
| VPS running Ubuntu 22.04 or 24.04 LTS | Hetzner CX22, DigitalOcean $6 droplet, Vultr, etc. — 2GB RAM is plenty to start |
| The VPS IP address | `203.0.113.10` (from your provider's dashboard) |
| Root access | password or SSH key from your provider's welcome email |
| An SSH key on YOUR computer | see Step 0 below if you don't have one |

---

## Step 0 — SSH key on your computer (skip if you have one)

On your Mac/Windows/Linux machine, in a terminal (PowerShell is fine on Windows):

```bash
ssh-keygen -t ed25519 -C "ty@tyalexandermedia.com"
```

Press Enter at every prompt (default location, empty passphrase is acceptable;
a passphrase is more secure if you'll remember it).

**You should see:** `Your public key has been saved in ~/.ssh/id_ed25519.pub`

Print your PUBLIC key (safe to share — you'll paste it during setup):

```bash
cat ~/.ssh/id_ed25519.pub
```

---

## Step 1 — First connection (as root)

```bash
ssh root@YOUR_VPS_IP
```

**You should see:** a warning about host authenticity — type `yes`. Then a
Ubuntu welcome banner and a `root@hostname:~#` prompt.

> If your provider gave you a different first user (e.g. `ubuntu` on AWS/
> Oracle), use that and prefix later root commands with `sudo`.

---

## Step 2 — Run the hardening script

Still as root on the VPS:

```bash
apt-get update && apt-get install -y git
git clone https://github.com/tyalexandermedia/lola-backend.git /root/lola-backend
cd /root/lola-backend/infra/vps/setup
bash 01-secure.sh
```

The script walks you through everything interactively:
- system update
- creating your non-root user (default name: `lola`)
- installing your SSH key for that user (it copies root's keys automatically,
  and lets you paste the key from Step 0)
- firewall (UFW): only SSH, HTTP, HTTPS allowed in
- Fail2Ban: auto-bans SSH brute-forcers
- automatic security updates
- SSH hardening — **it makes you test the new login in a second terminal
  before it disables root/password login**, so you cannot lock yourself out

**You should see** at the end: `Done. Security summary` with all items listed.

---

## Step 3 — Reconnect as your new user

Close the root session (`exit`), then:

```bash
ssh lola@YOUR_VPS_IP
```

**You should see:** a normal `lola@hostname:~$` prompt with no password asked
(your key logs you in).

Make life easier — on YOUR computer, add to `~/.ssh/config`:

```
Host lola-cloud
    HostName YOUR_VPS_IP
    User lola
    IdentityFile ~/.ssh/id_ed25519
```

Now `ssh lola-cloud` works from anywhere, and VS Code will see it too.

---

## Step 4 — VS Code Remote SSH

1. Open VS Code → Extensions → install **Remote - SSH** (by Microsoft).
2. Press `F1` (or `Cmd/Ctrl+Shift+P`) → type `Remote-SSH: Connect to Host…`
3. Pick **lola-cloud** (from the config in Step 3).
4. A new window opens; the bottom-left green corner shows `SSH: lola-cloud`.
5. `File → Open Folder…` → `/opt/lola-cloud` (after Step 5 creates it).

**You should see:** the VPS filesystem in VS Code's explorer. The built-in
terminal (`` Ctrl+` ``) runs commands ON the VPS.

---

## Step 5 — Install tools + create the workspace

In the VPS terminal (VS Code terminal or ssh):

```bash
sudo bash /root/lola-backend/infra/vps/setup/02-install.sh 2>/dev/null \
  || { sudo git clone https://github.com/tyalexandermedia/lola-backend.git ~/lola-backend-setup 2>/dev/null; sudo bash ~/lola-backend-setup/infra/vps/setup/02-install.sh; }
sudo bash /root/lola-backend/infra/vps/setup/03-folders.sh 2>/dev/null \
  || sudo bash ~/lola-backend-setup/infra/vps/setup/03-folders.sh
```

(The fallback clone handles the case where `/root` isn't readable by your user.)

- `02-install.sh` installs Git, curl, wget, unzip, htop, tree, Node LTS, npm,
  PM2, Python 3 + pip + venv, Nginx, Certbot — and prints every version at the
  end. **No Docker** — not needed for static sites + PM2-managed apps; it can
  be added later if a client genuinely requires it.
- `03-folders.sh` builds `/opt/lola-cloud` (structure below), installs the
  deploy/backup/health scripts, copies these docs, and gives you the shortcuts
  `lola-deploy`, `lola-backup`, `lola-health`.

**You should see:** a folder tree printout ending with
`NEXT (no sudo): bash /opt/lola-cloud/infrastructure/vps-setup/setup/04-github.sh`

### The folder structure

```
/opt/lola-cloud
├── infrastructure/   server configs, nginx templates, this setup kit
├── clients/          one folder per client website
│   ├── sandbar-soft-wash/
│   ├── tampa-bay-power-clean/
│   └── travels-by-val/
├── templates/        reusable client site templates
├── blueprints/       service blueprints (SEO packages, site packages…)
├── agents/           AI agent code (lola-backend lives here)
├── seo/              local SEO systems and data
├── content/          generated content drafts
├── automation/       CRM automations, cron jobs, integrations
├── scripts/          deploy.sh, backup.sh, health-check.sh
├── docs/             these documents
├── logs/             deployment + backup logs
├── backups/          timestamped backups (owner-only permissions)
├── deployments/      release notes / manifests
├── reports/          client reports and audits
└── assets/           shared logos, images, brand files
```

Everything is owned by your user — daily work never needs `sudo`.

---

## Step 6 — Connect GitHub

```bash
bash /opt/lola-cloud/infrastructure/vps-setup/setup/04-github.sh
```

It sets your git identity, creates a **dedicated** SSH key for GitHub, shows
you the public key to paste at <https://github.com/settings/ssh/new>, tests
the connection, and offers to clone your repos into the right folders.

**You should see:** `GitHub connection works!`

---

## Step 7 — Nginx & SSL (per site, when DNS is ready)

Placeholder configs for all four known domains are pre-made. See
`infrastructure/vps-setup/nginx/sites/README.md` — enabling a site is 3
commands, SSL is 1 more. Nothing is enabled automatically, so nothing live
can break.

---

## Step 8 — Verify everything (final QA)

```bash
lola-health
```

**You should see:** green ✔ on uptime, disk, memory, Nginx, firewall,
Fail2Ban, plus Node/Python/Git versions, ending in `All checks passed. ✔`

Also confirm:

```bash
tree -L 1 /opt/lola-cloud        # folder structure exists
ls /opt/lola-cloud/scripts       # deploy.sh backup.sh health-check.sh
ls /opt/lola-cloud/docs          # the 5 docs
ssh -T git@github.com            # "successfully authenticated"
lola-backup && lola-backup --list  # first backup works
```

---

## Maintenance cheat-sheet

| Task | Command |
|---|---|
| Health check | `lola-health` |
| Deploy a client site | `lola-deploy sandbar-soft-wash` |
| Manual backup | `lola-backup` |
| See what's using RAM/CPU | `htop` (q to quit) |
| Restart Nginx | `sudo systemctl restart nginx` |
| App logs | `pm2 logs` |
| Who's been banned | `sudo fail2ban-client status sshd` |
| Reboot safely | `sudo reboot` (PM2 apps auto-restart) |

Monthly (5 minutes): `sudo apt update && sudo apt upgrade -y`, then `lola-health`.
