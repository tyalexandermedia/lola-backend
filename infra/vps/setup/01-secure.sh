#!/usr/bin/env bash
#
# 01-secure.sh — Lola Cloud VPS hardening
#
# Run this FIRST, on a fresh Ubuntu VPS, as root:
#   bash 01-secure.sh
#
# What it does (asking before anything risky):
#   1. Full system update
#   2. Creates a non-root sudo user
#   3. Installs your SSH public key for that user
#   4. Hardens SSH (disables root login + password auth) — ONLY after you
#      confirm your key login works, so you can never lock yourself out
#   5. UFW firewall: allow SSH/HTTP/HTTPS, deny everything else inbound
#   6. Fail2Ban (auto-bans IPs that brute-force SSH)
#   7. Automatic security updates (unattended-upgrades)
#
# Idempotent: safe to re-run.

set -euo pipefail

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  ⚠ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m  ✖ %s\033[0m\n' "$*"; exit 1; }

[[ $EUID -eq 0 ]] || die "Run as root: sudo bash 01-secure.sh"
command -v apt-get >/dev/null || die "This script expects Ubuntu/Debian (apt)."

export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------- 1. Updates
say "Step 1/7: Updating the system (this can take a few minutes)"
apt-get update -y
apt-get upgrade -y
ok "System is up to date."

# ---------------------------------------------------------- 2. Non-root user
say "Step 2/7: Creating a non-root sudo user"
read -rp "  Username for your daily-driver account [lola]: " NEW_USER
NEW_USER=${NEW_USER:-lola}

if id "$NEW_USER" &>/dev/null; then
    ok "User '$NEW_USER' already exists — skipping creation."
else
    adduser --disabled-password --gecos "" "$NEW_USER"
    say "Set a password for '$NEW_USER' (used for 'sudo' prompts, not SSH):"
    passwd "$NEW_USER"
    ok "User '$NEW_USER' created."
fi
usermod -aG sudo "$NEW_USER"
ok "'$NEW_USER' can use sudo."

# ------------------------------------------------------------- 3. SSH key(s)
say "Step 3/7: Installing your SSH public key for '$NEW_USER'"
USER_HOME=$(getent passwd "$NEW_USER" | cut -d: -f6)
mkdir -p "$USER_HOME/.ssh"
touch "$USER_HOME/.ssh/authorized_keys"

if [[ -s /root/.ssh/authorized_keys ]]; then
    # Copy any keys already authorized for root (typical on new VPSes)
    while IFS= read -r key; do
        [[ -z "$key" ]] && continue
        grep -qF "$key" "$USER_HOME/.ssh/authorized_keys" || echo "$key" >> "$USER_HOME/.ssh/authorized_keys"
    done < /root/.ssh/authorized_keys
    ok "Copied existing authorized keys from root."
fi

echo "  Paste an additional SSH PUBLIC key (starts with 'ssh-ed25519' or 'ssh-rsa'),"
read -rp "  or press Enter to skip: " EXTRA_KEY
if [[ -n "${EXTRA_KEY:-}" ]]; then
    grep -qF "$EXTRA_KEY" "$USER_HOME/.ssh/authorized_keys" || echo "$EXTRA_KEY" >> "$USER_HOME/.ssh/authorized_keys"
    ok "Key added."
fi

chmod 700 "$USER_HOME/.ssh"
chmod 600 "$USER_HOME/.ssh/authorized_keys"
chown -R "$NEW_USER:$NEW_USER" "$USER_HOME/.ssh"

[[ -s "$USER_HOME/.ssh/authorized_keys" ]] || warn "No SSH keys installed for $NEW_USER — SSH hardening will be skipped later."

# ----------------------------------------------------------- 4. UFW firewall
say "Step 4/7: Configuring UFW firewall (SSH + HTTP + HTTPS only)"
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH      # port 22 — never lock this out
ufw allow 80/tcp       # HTTP  (websites + Certbot validation)
ufw allow 443/tcp      # HTTPS (SSL websites)
ufw --force enable
ok "Firewall active. Current rules:"
ufw status verbose | sed 's/^/    /'

# -------------------------------------------------------------- 5. Fail2Ban
say "Step 5/7: Installing Fail2Ban (bans IPs that brute-force SSH)"
apt-get install -y fail2ban
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban
ok "Fail2Ban running (5 failed SSH logins in 10 min = 1 hour ban)."

# ------------------------------------------------- 6. Auto security updates
say "Step 6/7: Enabling automatic security updates"
apt-get install -y unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades
ok "Ubuntu will now install security patches automatically."

# -------------------------------------------------------- 7. SSH hardening
say "Step 7/7: SSH hardening (disable root login + password auth)"

if [[ ! -s "$USER_HOME/.ssh/authorized_keys" ]]; then
    warn "Skipping: '$NEW_USER' has no SSH key installed. Add one, then re-run this script."
else
    warn "BEFORE continuing, open a SECOND terminal on your computer and confirm this works:"
    echo
    echo "      ssh $NEW_USER@$(hostname -I | awk '{print $1}')"
    echo
    warn "Keep this session open while you test. If the test login fails, answer 'no'."
    read -rp "  Did key-based login as '$NEW_USER' work in the other terminal? [yes/no]: " CONFIRM
    if [[ "${CONFIRM,,}" == "yes" ]]; then
        mkdir -p /etc/ssh/sshd_config.d
        cat > /etc/ssh/sshd_config.d/99-lola-hardening.conf <<'EOF'
# Lola Cloud hardening — managed by 01-secure.sh
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 4
EOF
        sshd -t || die "sshd config test failed — hardening NOT applied."
        systemctl reload ssh 2>/dev/null || systemctl reload sshd
        ok "Root login and password auth disabled. Key-only SSH from now on."
    else
        warn "Skipped SSH hardening. Fix key login, then re-run this script — it is safe to re-run."
    fi
fi

say "Done. Security summary"
echo "    • Non-root sudo user:   $NEW_USER"
echo "    • Firewall:             UFW active (22, 80, 443 only)"
echo "    • Brute-force defense:  Fail2Ban active"
echo "    • Security patches:     automatic"
echo
echo "  NEXT: log out of root, reconnect as '$NEW_USER', then run:"
echo "      sudo bash 02-install.sh"
