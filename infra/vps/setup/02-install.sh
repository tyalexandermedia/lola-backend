#!/usr/bin/env bash
#
# 02-install.sh — Lola Cloud core tooling
#
# Run as your non-root user AFTER 01-secure.sh:
#   sudo bash 02-install.sh
#
# Installs and verifies:
#   • Basics:  git, curl, wget, unzip, htop, tree
#   • Node.js LTS + npm (via NodeSource) + PM2 (process manager)
#   • Python 3 + pip + venv
#   • Nginx (web server) + Certbot (free SSL)
#
# Deliberately NO Docker — plain Nginx + PM2 covers static sites and Node/Python
# apps with less RAM, less complexity, and easier debugging. Add Docker later
# only if a client app actually requires it.
#
# Idempotent: safe to re-run.

set -euo pipefail

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✔ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m  ✖ %s\033[0m\n' "$*"; exit 1; }

[[ $EUID -eq 0 ]] || die "Run with sudo: sudo bash 02-install.sh"
export DEBIAN_FRONTEND=noninteractive

say "Step 1/5: Base utilities (git, curl, wget, unzip, htop, tree)"
apt-get update -y
apt-get install -y git curl wget unzip htop tree ca-certificates gnupg
ok "Base utilities installed."

say "Step 2/5: Node.js LTS + npm (NodeSource official repo)"
if command -v node >/dev/null && node --version | grep -qE '^v(2[2-9]|[3-9][0-9])'; then
    ok "Node $(node --version) already installed — skipping."
else
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt-get install -y nodejs
    ok "Node $(node --version) / npm $(npm --version) installed."
fi

say "Step 3/5: PM2 (keeps Node/Python apps running, restarts on reboot)"
if command -v pm2 >/dev/null; then
    ok "PM2 $(pm2 --version) already installed — skipping."
else
    npm install -g pm2
    ok "PM2 $(pm2 --version) installed."
fi
# Make PM2-managed apps start on reboot for the invoking (non-root) user
REAL_USER=${SUDO_USER:-$USER}
if [[ "$REAL_USER" != "root" ]]; then
    env PATH="$PATH" pm2 startup systemd -u "$REAL_USER" --hp "$(getent passwd "$REAL_USER" | cut -d: -f6)" >/dev/null
    ok "PM2 will restart '$REAL_USER' apps automatically after a reboot."
fi

say "Step 4/5: Python 3 + pip + venv"
apt-get install -y python3 python3-pip python3-venv
ok "Python $(python3 --version | awk '{print $2}') / pip installed."

say "Step 5/5: Nginx + Certbot (web server + free SSL)"
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable --now nginx
ok "Nginx running. Certbot ready (SSL is issued later, per-domain — see docs/DEPLOYMENT.md)."

say "Verification"
for tool in git curl wget unzip htop tree node npm pm2 python3 pip3 nginx certbot; do
    if command -v "$tool" >/dev/null; then
        printf '    %-9s %s\n' "$tool" "$("$tool" --version 2>&1 | head -1)"
    else
        die "$tool missing — re-run this script."
    fi
done

echo
echo "  NEXT: sudo bash 03-folders.sh"
