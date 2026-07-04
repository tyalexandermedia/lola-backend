# Lola Cloud — VPS Setup Kit

Everything needed to turn a fresh Ubuntu VPS into the Lola Cloud foundation:
secured server, core tooling, `/opt/lola-cloud` workspace, Nginx, SSL,
deploy/backup/health scripts, and documentation.

**No secrets live in this folder. Never commit keys, tokens, or passwords.**

## What's in here

```
infra/vps/
├── README.md                  ← you are here (order of operations)
├── setup/
│   ├── 01-secure.sh           Run FIRST, as root: updates, sudo user, SSH keys,
│   │                          firewall (UFW), Fail2Ban, automatic security updates
│   ├── 02-install.sh          Core tools: Git, Node LTS, Python 3, Nginx, Certbot, PM2
│   ├── 03-folders.sh          Creates /opt/lola-cloud structure + permissions,
│   │                          installs deploy/backup/health scripts and docs
│   └── 04-github.sh           Git identity + SSH key for GitHub + connection test
├── nginx/
│   ├── client-site.conf.template   Reusable server block for any client site
│   └── sites/                      Ready-made placeholder configs for known domains
├── scripts/
│   ├── deploy.sh              Pull latest → install deps → restart → reload Nginx → log
│   ├── backup.sh              Timestamped tar.gz backups into /opt/lola-cloud/backups
│   ├── health-check.sh        Uptime, disk, memory, Nginx, firewall, tool versions
│   └── new-client.sh          Scaffold a client site from the template (lola-new-client)
├── templates/
│   └── local-business-starter/  Mobile-first one-pager: LocalBusiness schema,
│                                call-first CTAs, quote form — filled by new-client.sh
└── docs/                      Copied to /opt/lola-cloud/docs by 03-folders.sh
    ├── VPS_SETUP.md
    ├── SECURITY.md
    ├── DEPLOYMENT.md
    ├── BACKUPS.md
    ├── CLIENT_ONBOARDING.md
    └── MIGRATION.md           Site-by-site plan off Vercel/Wix (audited stacks)
```

## Order of operations (fresh VPS)

Full copy-paste walkthrough with expected output: [`docs/VPS_SETUP.md`](docs/VPS_SETUP.md).

Short version:

```bash
# 1. On the VPS as root (first login):
apt-get update && apt-get install -y git
git clone https://github.com/tyalexandermedia/lola-backend.git /root/lola-backend
cd /root/lola-backend/infra/vps/setup
bash 01-secure.sh          # creates your sudo user, hardens SSH, firewall, Fail2Ban

# 2. Reconnect as the new user (NOT root), then:
sudo bash /root/lola-backend/infra/vps/setup/02-install.sh
sudo bash /root/lola-backend/infra/vps/setup/03-folders.sh
bash /opt/lola-cloud/infrastructure/vps-setup/setup/04-github.sh   # no sudo
```

Every script:
- is **idempotent** — safe to re-run if something fails halfway,
- **explains what it is doing** as it runs,
- **pauses and asks before anything destructive or lock-out-risky**
  (e.g. it will never disable SSH password login without confirming your key works).

## Day-to-day commands (after setup)

```bash
lola-health                          # server health at a glance
lola-backup                          # manual backup now
lola-deploy <client-folder>          # deploy one client site
lola-new-client <folder> <domain>    # scaffold a new client site from the template
```

(These are symlinks in /usr/local/bin created by 03-folders.sh.)
