#!/usr/bin/env bash
#
# backup.sh — back up the important parts of Lola Cloud
#
# Usage:
#   lola-backup            # normal backup
#   lola-backup --list     # show existing backups
#
# What it does:
#   1. Creates a timestamped tar.gz of the folders that matter:
#        clients/ templates/ blueprints/ agents/ seo/ content/ automation/
#        scripts/ docs/ deployments/ reports/  + /etc/nginx/sites-available
#      (skips heavy regenerable stuff: node_modules, .venv, logs, backups)
#   2. Stores it in /opt/lola-cloud/backups/lola-cloud_YYYY-MM-DD_HHMM.tar.gz
#   3. Keeps the newest 14 backups, deletes older ones
#   4. Logs to /opt/lola-cloud/logs/backups.log
#
# To automate nightly at 2:30am, run:  crontab -e   and add:
#   30 2 * * * /opt/lola-cloud/scripts/backup.sh >> /opt/lola-cloud/logs/backups.log 2>&1
#
# NOTE: these backups live on the SAME server. For real disaster recovery,
# also download them periodically or sync off-site — see docs/BACKUPS.md.

set -euo pipefail

ROOT=/opt/lola-cloud
DEST="$ROOT/backups"
LOG="$ROOT/logs/backups.log"
KEEP=14

if [[ "${1:-}" == "--list" ]]; then
    ls -lh "$DEST"/lola-cloud_*.tar.gz 2>/dev/null || echo "No backups yet."
    exit 0
fi

STAMP=$(date '+%Y-%m-%d_%H%M')
FILE="$DEST/lola-cloud_${STAMP}.tar.gz"
mkdir -p "$DEST" "$(dirname "$LOG")"

printf '\033[1;36m==> Backing up Lola Cloud → %s\033[0m\n' "$FILE"

TARGETS=()
for d in clients templates blueprints agents seo content automation scripts docs deployments reports infrastructure; do
    [[ -d "$ROOT/$d" ]] && TARGETS+=("$d")
done

tar -czf "$FILE" \
    -C "$ROOT" \
    --exclude='*/node_modules' \
    --exclude='*/.venv' \
    --exclude='*/.next/cache' \
    --exclude='*/dist/cache' \
    "${TARGETS[@]}"

# Include nginx site configs if readable (run with sudo to include them)
if [[ -r /etc/nginx/sites-available ]]; then
    NGINX_COPY="$ROOT/infrastructure/nginx-sites-available"
    mkdir -p "$NGINX_COPY"
    cp -f /etc/nginx/sites-available/* "$NGINX_COPY/" 2>/dev/null || true
fi

SIZE=$(du -h "$FILE" | cut -f1)
printf '\033[1;32m  ✔ Backup created (%s)\033[0m\n' "$SIZE"

# Prune: keep newest $KEEP
ls -1t "$DEST"/lola-cloud_*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
    rm -f "$old"
    printf '  ✔ Pruned old backup: %s\n' "$(basename "$old")"
done

echo "$(date '+%Y-%m-%d %H:%M:%S') | $FILE | $SIZE" >> "$LOG"
printf '\033[1;32m  ✔ Logged. Backups on disk: %s\033[0m\n' "$(ls -1 "$DEST"/lola-cloud_*.tar.gz | wc -l)"
