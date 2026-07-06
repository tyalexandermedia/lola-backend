#!/usr/bin/env bash
#
# finish-setup.sh — one-paste completion of everything after first boot
#
# Run as root on the VPS:
#   sudo bash -c 'cd /root/lola-backend && git pull && bash infra/vps/scripts/finish-setup.sh'
#
# Idempotent. Does, in order:
#   1. Updates the installed kit (scripts/docs/folders) from the repo
#   2. Applies SSH hardening (auto-reverts if the config test fails)
#   3. Schedules nightly backups (2:30am) + daily health log (7:00am)
#   4. Runs a first backup
#   5. Runs the health check and prints a final report

set -uo pipefail
PROBLEMS=0
KIT=/root/lola-backend/infra/vps
say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
bad() { printf '\033[1;31m  ✖ %s\033[0m\n' "$*"; PROBLEMS=$((PROBLEMS+1)); }
ok()  { printf '\033[1;32m  ✔ %s\033[0m\n' "$*"; }

[[ $EUID -eq 0 ]] || { echo "Run with sudo."; exit 1; }
[[ -d $KIT ]] || { echo "Kit not found at $KIT — clone the repo first."; exit 1; }

say "1/5 Refreshing installed kit (folders, scripts, docs)"
LOLA_OWNER=lola bash "$KIT/setup/03-folders.sh" >/dev/null && ok "Kit refreshed." || bad "kit refresh (03-folders.sh)"

say "2/5 SSH hardening (key-only, no root login)"
mkdir -p /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/99-lola-hardening.conf <<'EOF'
# Lola Cloud hardening — managed by finish-setup.sh
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 4
EOF
SSHD_BIN=$(command -v sshd || echo /usr/sbin/sshd)
if "$SSHD_BIN" -t; then
    systemctl reload ssh 2>/dev/null || systemctl reload sshd
    ok "Hardening applied and live."
else
    rm -f /etc/ssh/sshd_config.d/99-lola-hardening.conf
    bad "sshd config test failed — hardening reverted (send this output to Claude)"
    "$SSHD_BIN" -t || true
fi

say "3/5 Scheduling automation (backups nightly 2:30am, health log 7:00am)"
CRON_TMP=$(mktemp)
crontab -u lola -l 2>/dev/null | grep -v "lola-cloud/scripts" > "$CRON_TMP" || true
cat >> "$CRON_TMP" <<'EOF'
30 2 * * * /opt/lola-cloud/scripts/backup.sh >> /opt/lola-cloud/logs/backups.log 2>&1
0 7 * * * /opt/lola-cloud/scripts/health-check.sh >> /opt/lola-cloud/logs/health.log 2>&1
EOF
crontab -u lola "$CRON_TMP" && rm -f "$CRON_TMP" && ok "Cron installed for user lola." || bad "cron install"

say "4/5 First backup"
sudo -u lola /opt/lola-cloud/scripts/backup.sh && ok "Backup done." || bad "first backup"

say "5/5 Health check"
bash /opt/lola-cloud/scripts/health-check.sh || PROBLEMS=$((PROBLEMS+1))

echo
echo "════════════════ FINAL REPORT ════════════════"
if [[ $PROBLEMS -eq 0 ]]; then
    echo "  ✔ SERVER-SIDE SETUP 100% COMPLETE"
else
    echo "  ✖ $PROBLEMS item(s) above need attention"
fi
echo
echo "  Remaining (outside this server):"
echo "   1. sudo reboot            (kernel updates — run it now, reconnect in ~90s)"
echo "   2. Lightsail console → Networking: attach Static IP + open HTTPS 443"
echo "   3. GitHub connect:  bash /opt/lola-cloud/infrastructure/vps-setup/setup/04-github.sh"
echo "═══════════════════════════════════════════════"
