#!/usr/bin/env bash
#
# deploy.sh — deploy one Lola Cloud client site
#
# Usage:
#   lola-deploy sandbar-soft-wash
#   lola-deploy travels-by-val "optional note for the log"
#
# What it does, in order:
#   1. cd /opt/lola-cloud/clients/<name>
#   2. git pull (latest from GitHub)
#   3. npm ci / pip install  — only if the project actually has deps
#   4. npm run build         — only if a build script exists
#   5. pm2 restart <name>    — only if a PM2 app with that name exists
#   6. nginx config test + reload
#   7. append a line to /opt/lola-cloud/logs/deployments.log
#
# Static sites (plain HTML/CSS) need only steps 1, 6, 7 — the rest self-skip.

set -euo pipefail

ROOT=/opt/lola-cloud
LOG="$ROOT/logs/deployments.log"

say()  { printf '\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✔ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m  ✖ %s\033[0m\n' "$*"; exit 1; }

CLIENT=${1:-}
NOTE=${2:-manual deploy}
if [[ -z "$CLIENT" ]]; then
    echo "Usage: lola-deploy <client-folder> [note]"
    echo "Available clients:"
    ls -1 "$ROOT/clients" | sed 's/^/  - /'
    exit 1
fi

DIR="$ROOT/clients/$CLIENT"
[[ -d "$DIR" ]] || die "No such client folder: $DIR"

say "Deploying '$CLIENT'"
cd "$DIR"

# --- 1. Pull latest ----------------------------------------------------------
if [[ -d .git ]]; then
    BEFORE=$(git rev-parse --short HEAD)
    git pull --ff-only
    AFTER=$(git rev-parse --short HEAD)
    ok "Git: $BEFORE → $AFTER"
else
    ok "Not a git repo — skipping pull (files deployed as-is)."
    AFTER="(no git)"
fi

# --- 2. Dependencies + build (only when present) ------------------------------
if [[ -f package.json ]]; then
    if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
    ok "Node dependencies installed."
    if grep -q '"build"' package.json; then
        npm run build
        ok "Build completed."
    fi
fi
if [[ -f requirements.txt ]]; then
    [[ -d .venv ]] || python3 -m venv .venv
    ./.venv/bin/pip install -q -r requirements.txt
    ok "Python dependencies installed (in .venv)."
fi

# --- 3. Restart app process if PM2 manages one --------------------------------
if command -v pm2 >/dev/null && pm2 describe "$CLIENT" >/dev/null 2>&1; then
    pm2 restart "$CLIENT" --update-env
    ok "PM2 app '$CLIENT' restarted."
else
    ok "No PM2 app named '$CLIENT' — static site, nothing to restart."
fi

# --- 4. Reload Nginx (config is tested first; a bad config aborts safely) -----
sudo nginx -t
sudo systemctl reload nginx
ok "Nginx config OK and reloaded."

# --- 5. Log it -----------------------------------------------------------------
mkdir -p "$(dirname "$LOG")"
echo "$(date '+%Y-%m-%d %H:%M:%S') | $CLIENT | $AFTER | $USER | $NOTE" >> "$LOG"
ok "Logged to $LOG"

say "Deploy of '$CLIENT' complete."
