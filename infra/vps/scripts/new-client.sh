#!/usr/bin/env bash
#
# new-client.sh — scaffold a new client site on Lola Cloud
#
# Usage:
#   lola-new-client <folder-name> <domain>
#   lola-new-client tampa-bay-power-clean tampabaypowerclean.com
#
# What it does:
#   1. Copies templates/local-business-starter → clients/<folder-name>
#   2. Asks for business details and fills in every {{TOKEN}}
#   3. Creates the Nginx config in /etc/nginx/sites-available (NOT enabled —
#      enabling and DNS are deliberate, separate steps)
#   4. Initializes a git repo with a first commit and a clean .gitignore
#   5. Prints the exact remaining steps (GitHub repo, enable site, DNS, SSL)
#
# Never overwrites an existing client folder or Nginx config.

set -euo pipefail

ROOT=/opt/lola-cloud
TEMPLATE="$ROOT/templates/local-business-starter"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✔ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m  ✖ %s\033[0m\n' "$*"; exit 1; }

FOLDER=${1:-}; DOMAIN=${2:-}
[[ -n "$FOLDER" && -n "$DOMAIN" ]] || die "Usage: lola-new-client <folder-name> <domain>   e.g. lola-new-client acme-plumbing acmeplumbing.com"
[[ -d "$TEMPLATE" ]] || die "Template missing at $TEMPLATE — re-run 03-folders.sh"

DEST="$ROOT/clients/$FOLDER"
[[ ! -e "$DEST" || -z "$(ls -A "$DEST" 2>/dev/null)" ]] || die "$DEST already exists and is not empty — refusing to overwrite."

say "Business details for $DOMAIN"
read -rp "  Business name (e.g. Acme Plumbing): " BIZ
read -rp "  Phone, digits only with country code (e.g. +18135550123): " PHONE
read -rp "  Phone as displayed (e.g. (813) 555-0123): " PHONE_DISPLAY
read -rp "  City (e.g. Tampa): " CITY
read -rp "  Main service (e.g. Plumbing): " SERVICE
[[ -n "$BIZ" && -n "$PHONE" && -n "$CITY" && -n "$SERVICE" ]] || die "All fields are required."
PHONE_DISPLAY=${PHONE_DISPLAY:-$PHONE}

say "Step 1/4: Scaffolding $DEST from template"
mkdir -p "$DEST"
cp -r "$TEMPLATE"/. "$DEST"/
rm -f "$DEST/README.md"   # template instructions don't belong in the client site
# Fill in tokens (| delimiter so phone/city content can't break sed)
for f in "$DEST"/index.html "$DEST"/style.css "$DEST"/robots.txt "$DEST"/sitemap.xml; do
    sed -i \
        -e "s|{{BUSINESS_NAME}}|$BIZ|g" \
        -e "s|{{DOMAIN}}|$DOMAIN|g" \
        -e "s|{{PHONE_DISPLAY}}|$PHONE_DISPLAY|g" \
        -e "s|{{PHONE}}|$PHONE|g" \
        -e "s|{{CITY}}|$CITY|g" \
        -e "s|{{SERVICE}}|$SERVICE|g" \
        "$f"
done
grep -rl '{{' "$DEST" >/dev/null 2>&1 && die "Unfilled tokens remain — check the files in $DEST" || ok "All tokens filled."

say "Step 2/4: Nginx config (created, NOT enabled)"
NGINX_SRC="$ROOT/infrastructure/vps-setup/nginx/client-site.conf.template"
NGINX_DST="/etc/nginx/sites-available/$DOMAIN"
if [[ -e "$NGINX_DST" ]]; then
    ok "$NGINX_DST already exists — leaving it alone."
else
    sed -e "s|CLIENTDOMAIN\.com|$DOMAIN|g" -e "s|CLIENTDOMAIN|$DOMAIN|g" -e "s|CLIENTFOLDER|$FOLDER|g" "$NGINX_SRC" \
        | sudo tee "$NGINX_DST" >/dev/null
    ok "Created $NGINX_DST"
fi

say "Step 3/4: Git repo + first commit"
cd "$DEST"
if [[ -d .git ]]; then
    ok "Already a git repo — skipping."
else
    git init -q
    cat > .gitignore <<'EOF'
.env
.env.*
node_modules/
dist/
.DS_Store
*.log
EOF
    git add -A
    git commit -qm "Scaffold $BIZ site from local-business-starter template"
    ok "Repo initialized, first commit made."
fi

say "Step 4/4: Done. Remaining steps (in order):"
cat <<EOF

  1. Content pass — real services, real reviews, real photos:
        code $DEST   (or edit in VS Code Remote SSH)
     Wire the quote form's action to your lead endpoint.

  2. Create the GitHub repo (private) at https://github.com/new named '$FOLDER', then:
        cd $DEST
        git remote add origin git@github.com:tyalexandermedia/$FOLDER.git
        git push -u origin main

  3. Preview locally BEFORE touching DNS:
        sudo ln -s $NGINX_DST /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx
        curl -H "Host: $DOMAIN" http://localhost/ | head

  4. DNS at the registrar (only when ready to go live — this is the cutover):
        A record   @     <this VPS IP>
        A record   www   <this VPS IP>

  5. SSL once DNS resolves here:
        sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

  Full checklist: $ROOT/docs/CLIENT_ONBOARDING.md
EOF
