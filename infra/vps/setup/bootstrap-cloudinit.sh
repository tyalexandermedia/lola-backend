#!/usr/bin/env bash
#
# bootstrap-cloudinit.sh — fully automatic Lola Cloud setup (zero interaction)
#
# Runs as root on first boot via Hetzner cloud-init (see ../cloud-init.yaml).
# Does everything 01-secure.sh + 02-install.sh + 03-folders.sh do, without
# prompts. Progress is logged to /var/log/lola-bootstrap.log; a summary is
# written to /etc/motd so it greets the first SSH login.
#
# Safety: SSH hardening (root/password login off) is applied ONLY if the
# 'lola' user ends up with an authorized SSH key — which Hetzner guarantees
# when an SSH key is selected at server creation. No key = no lockout risk,
# hardening is skipped and flagged in the summary instead.

set -uo pipefail
export DEBIAN_FRONTEND=noninteractive

NEW_USER=lola
KIT_REPO=/root/lola-backend            # cloned by cloud-init before this runs
KIT_DIR=$KIT_REPO/infra/vps
FAILURES=()

stage() { echo; echo "===== [$(date '+%H:%M:%S')] $* ====="; }
fail()  { echo "  !!! FAILED: $*"; FAILURES+=("$*"); }

stage "1/8 System update"
apt-get update -y && apt-get upgrade -y || fail "system update"

stage "2/8 Create user '$NEW_USER' (passwordless sudo, SSH keys from root)"
if ! id "$NEW_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" "$NEW_USER" || fail "create user"
fi
usermod -aG sudo "$NEW_USER"
echo "$NEW_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-lola
chmod 440 /etc/sudoers.d/90-lola
mkdir -p /home/$NEW_USER/.ssh
if [[ -s /root/.ssh/authorized_keys ]]; then
    cp /root/.ssh/authorized_keys /home/$NEW_USER/.ssh/authorized_keys
else
    touch /home/$NEW_USER/.ssh/authorized_keys
    fail "no SSH key found on root — select your SSH key when creating the server"
fi
chmod 700 /home/$NEW_USER/.ssh
chmod 600 /home/$NEW_USER/.ssh/authorized_keys
chown -R $NEW_USER:$NEW_USER /home/$NEW_USER/.ssh

stage "3/8 Firewall (UFW: SSH/HTTP/HTTPS only)"
apt-get install -y ufw \
  && ufw default deny incoming && ufw default allow outgoing \
  && ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp \
  && ufw --force enable || fail "ufw"

stage "4/8 Fail2Ban + automatic security updates"
apt-get install -y fail2ban unattended-upgrades || fail "install fail2ban/unattended-upgrades"
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban || fail "fail2ban service"
dpkg-reconfigure -f noninteractive unattended-upgrades || fail "unattended-upgrades"

stage "5/8 Core tools (Git, Node LTS, PM2, Python, Nginx, Certbot)"
bash "$KIT_DIR/setup/02-install.sh" || fail "02-install.sh"
# 02-install skips PM2 boot-persistence when not run via sudo — do it for lola:
command -v pm2 >/dev/null && env PATH="$PATH" pm2 startup systemd -u $NEW_USER --hp /home/$NEW_USER >/dev/null || fail "pm2 startup"

stage "6/8 Lola Cloud workspace (/opt/lola-cloud)"
LOLA_OWNER=$NEW_USER bash "$KIT_DIR/setup/03-folders.sh" || fail "03-folders.sh"

stage "7/8 SSH hardening (key-only, no root login)"
if [[ -s /home/$NEW_USER/.ssh/authorized_keys ]]; then
    mkdir -p /etc/ssh/sshd_config.d
    cat > /etc/ssh/sshd_config.d/99-lola-hardening.conf <<'EOF'
# Lola Cloud hardening — managed by bootstrap-cloudinit.sh
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 4
EOF
    if sshd -t; then
        systemctl reload ssh 2>/dev/null || systemctl reload sshd || fail "reload sshd"
    else
        rm -f /etc/ssh/sshd_config.d/99-lola-hardening.conf
        fail "sshd config test — hardening reverted"
    fi
else
    fail "SSH hardening skipped (no key for $NEW_USER) — server still allows root login"
fi

stage "8/8 Summary"
IP=$(hostname -I | awk '{print $1}')
{
    echo "════════════════════════════════════════════════════"
    echo "  LOLA CLOUD — automatic setup finished $(date '+%Y-%m-%d %H:%M UTC')"
    if [[ ${#FAILURES[@]} -eq 0 ]]; then
        echo "  Status: ALL STEPS SUCCEEDED ✔"
    else
        echo "  Status: ${#FAILURES[@]} step(s) need attention:"
        printf '    ✖ %s\n' "${FAILURES[@]}"
        echo "  Full log: /var/log/lola-bootstrap.log"
    fi
    echo
    echo "  Login:       ssh $NEW_USER@$IP"
    echo "  Workspace:   /opt/lola-cloud"
    echo "  Commands:    lola-health · lola-backup · lola-deploy · lola-new-client"
    echo "  Next step:   bash /opt/lola-cloud/infrastructure/vps-setup/setup/04-github.sh"
    echo "  Docs:        /opt/lola-cloud/docs/"
    echo "════════════════════════════════════════════════════"
} | tee /etc/motd

exit 0
