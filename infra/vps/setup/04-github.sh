#!/usr/bin/env bash
#
# 04-github.sh — connect this VPS to GitHub
#
# Run as your NORMAL user (no sudo):
#   bash 04-github.sh
#
# What it does:
#   1. Sets your Git username + email
#   2. Creates a dedicated SSH key for GitHub (never reuses your login key)
#   3. Shows you the PUBLIC key to paste into GitHub
#   4. Tests the GitHub connection
#   5. Optionally clones your repos into /opt/lola-cloud/clients
#
# No secrets are stored by this script. The PRIVATE key never leaves the VPS.
#
# Idempotent: safe to re-run.

set -euo pipefail

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  ⚠ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m  ✖ %s\033[0m\n' "$*"; exit 1; }

[[ $EUID -ne 0 ]] || die "Run WITHOUT sudo, as your normal user."

say "Step 1/4: Git identity"
CURRENT_NAME=$(git config --global user.name || true)
CURRENT_MAIL=$(git config --global user.email || true)
read -rp "  Git username [${CURRENT_NAME:-tyalexandermedia}]: " GIT_NAME
read -rp "  Git email    [${CURRENT_MAIL:-ty@tyalexandermedia.com}]: " GIT_MAIL
git config --global user.name  "${GIT_NAME:-${CURRENT_NAME:-tyalexandermedia}}"
git config --global user.email "${GIT_MAIL:-${CURRENT_MAIL:-ty@tyalexandermedia.com}}"
git config --global init.defaultBranch main
git config --global pull.rebase false
ok "Git identity: $(git config --global user.name) <$(git config --global user.email)>"

say "Step 2/4: SSH key for GitHub"
KEY=~/.ssh/id_ed25519_github
if [[ -f "$KEY" ]]; then
    ok "Key already exists at $KEY — reusing it."
else
    ssh-keygen -t ed25519 -C "$(git config --global user.email) (lola-cloud-vps)" -f "$KEY" -N ""
    ok "New key created."
fi
# Tell SSH to use this key for github.com
mkdir -p ~/.ssh && touch ~/.ssh/config && chmod 600 ~/.ssh/config
if ! grep -q "Host github.com" ~/.ssh/config; then
    cat >> ~/.ssh/config <<EOF

Host github.com
    HostName github.com
    User git
    IdentityFile $KEY
    IdentitiesOnly yes
EOF
    ok "SSH configured to use this key for github.com."
fi

say "Step 3/4: Add the key to GitHub"
echo "  1. Copy the PUBLIC key below (safe to share — it is not a secret):"
echo
sed 's/^/      /' "$KEY.pub"
echo
echo "  2. Open: https://github.com/settings/ssh/new"
echo "  3. Title: 'Lola Cloud VPS'  →  paste the key  →  Add SSH key"
echo
read -rp "  Press Enter once you've added the key to GitHub... " _

say "Step 4/4: Testing the GitHub connection"
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    ok "GitHub connection works!"
else
    warn "GitHub did not authenticate yet. Double-check the key was added, then re-run this script."
    exit 1
fi

echo
read -rp "  Clone your client repos into /opt/lola-cloud now? [yes/no]: " CLONE
if [[ "${CLONE,,}" == "yes" ]]; then
    declare -A REPOS=(
        [clients/sandbar-soft-wash]="git@github.com:tyalexandermedia/sandbar-site.git"
        [clients/travels-by-val]="git@github.com:tyalexandermedia/travelsbyval.git"
        [seo/lola-seo]="git@github.com:tyalexandermedia/lola-seo.git"
        [agents/lola-backend]="git@github.com:tyalexandermedia/lola-backend.git"
    )
    for dest in "${!REPOS[@]}"; do
        target="/opt/lola-cloud/$dest"
        if [[ -d "$target/.git" ]]; then
            ok "$dest already cloned — skipping."
        else
            git clone "${REPOS[$dest]}" "$target" && ok "Cloned into $dest" || warn "Could not clone ${REPOS[$dest]} (check repo access)."
        fi
    done
fi

say "GitHub setup complete."
echo "  Daily flow:  cd /opt/lola-cloud/clients/<client>  →  git pull / git push"
echo "  Deploys:     lola-deploy <client-folder>   (see docs/DEPLOYMENT.md)"
