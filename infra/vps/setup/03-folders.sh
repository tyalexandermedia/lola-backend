#!/usr/bin/env bash
#
# 03-folders.sh — Lola Cloud workspace at /opt/lola-cloud
#
# Run AFTER 02-install.sh:
#   sudo bash 03-folders.sh
#
# What it does:
#   1. Creates the full /opt/lola-cloud folder structure
#   2. Installs deploy.sh / backup.sh / health-check.sh into /opt/lola-cloud/scripts
#   3. Copies documentation into /opt/lola-cloud/docs
#   4. Copies this whole setup kit into /opt/lola-cloud/infrastructure/vps-setup
#   5. Sets ownership to your user (so you never need sudo for daily work)
#      and makes client folders readable by Nginx
#   6. Adds handy shortcuts: lola-deploy, lola-backup, lola-health
#
# Idempotent: safe to re-run. Never deletes anything.

set -euo pipefail

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✔ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m  ✖ %s\033[0m\n' "$*"; exit 1; }

[[ $EUID -eq 0 ]] || die "Run with sudo: sudo bash 03-folders.sh"

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # .../infra/vps
ROOT=/opt/lola-cloud
OWNER=${SUDO_USER:-$USER}
[[ "$OWNER" != "root" ]] || die "Run via sudo from your normal user, not as root directly."

say "Step 1/5: Creating folder structure at $ROOT"
# What each folder is for:
#   infrastructure/  server configs, this setup kit, nginx templates
#   clients/         one folder per client website/project
#   templates/       reusable client site templates
#   blueprints/      service blueprints (SEO packages, site packages, ...)
#   agents/          AI agent code and configs
#   seo/             local SEO systems and data
#   content/         generated content drafts and assets
#   automation/      CRM automations, cron jobs, integrations
#   scripts/         deploy.sh, backup.sh, health-check.sh, helpers
#   docs/            documentation (setup, security, deployment, onboarding)
#   logs/            deployment and automation logs
#   backups/         timestamped backups (created by backup.sh)
#   deployments/     deployment manifests / release notes
#   reports/         client reports, audits
#   assets/          shared images, logos, brand files
mkdir -p "$ROOT"/{infrastructure,templates,blueprints,agents,seo,content,automation,scripts,docs,logs,backups,deployments,reports,assets}
mkdir -p "$ROOT"/clients/{sandbar-soft-wash,tampa-bay-power-clean,travels-by-val}
ok "Folders created (existing folders untouched)."

say "Step 2/5: Installing scripts into $ROOT/scripts"
install -m 755 "$KIT_DIR"/scripts/deploy.sh       "$ROOT/scripts/deploy.sh"
install -m 755 "$KIT_DIR"/scripts/backup.sh       "$ROOT/scripts/backup.sh"
install -m 755 "$KIT_DIR"/scripts/health-check.sh "$ROOT/scripts/health-check.sh"
ok "deploy.sh, backup.sh, health-check.sh installed."

say "Step 3/5: Copying documentation into $ROOT/docs"
cp -f "$KIT_DIR"/docs/*.md "$ROOT/docs/"
ok "Docs installed: $(ls "$ROOT/docs" | tr '\n' ' ')"

say "Step 4/5: Keeping a copy of the setup kit in $ROOT/infrastructure/vps-setup"
mkdir -p "$ROOT/infrastructure/vps-setup"
cp -rf "$KIT_DIR"/. "$ROOT/infrastructure/vps-setup/"
ok "Setup kit copied (nginx templates live in infrastructure/vps-setup/nginx)."

say "Step 5/5: Permissions + shortcuts"
chown -R "$OWNER:$OWNER" "$ROOT"
chmod 755 "$ROOT" "$ROOT/clients"
# Nginx (www-data) only needs to READ client sites; 755 dirs / 644 files is enough.
find "$ROOT/clients" -type d -exec chmod 755 {} +
# Backups may contain sensitive data — owner only.
chmod 700 "$ROOT/backups"
ln -sf "$ROOT/scripts/deploy.sh"       /usr/local/bin/lola-deploy
ln -sf "$ROOT/scripts/backup.sh"       /usr/local/bin/lola-backup
ln -sf "$ROOT/scripts/health-check.sh" /usr/local/bin/lola-health
ok "Owned by '$OWNER'. Shortcuts: lola-deploy, lola-backup, lola-health"

say "Done. Structure:"
tree -L 2 -d "$ROOT" 2>/dev/null || find "$ROOT" -maxdepth 2 -type d | sort

echo
echo "  NEXT (no sudo): bash $ROOT/infrastructure/vps-setup/setup/04-github.sh"
