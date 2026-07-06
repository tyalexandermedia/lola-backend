#!/usr/bin/env bash
#
# health-check.sh — Lola Cloud server health at a glance
#
# Usage:  lola-health
#
# Checks: uptime, disk, memory, Nginx, firewall, Fail2Ban, PM2 apps,
#         and tool versions (Node, Python, Git).
# Exit code is non-zero if anything critical is down — usable in cron/alerts.

set -uo pipefail

PROBLEMS=0
line() { printf '%s\n' "----------------------------------------------------------"; }
okv()  { printf '  \033[1;32m✔\033[0m %-18s %s\n' "$1" "$2"; }
bad()  { printf '  \033[1;31m✖\033[0m %-18s %s\n' "$1" "$2"; PROBLEMS=$((PROBLEMS+1)); }

echo
printf '\033[1;36mLOLA CLOUD HEALTH CHECK — %s\033[0m\n' "$(date '+%Y-%m-%d %H:%M:%S')"
line

# Uptime
okv "Uptime" "$(uptime -p) (load:$(uptime | awk -F'load average:' '{print $2}'))"

# Disk — warn above 80% on /
DISK_PCT=$(df / --output=pcent | tail -1 | tr -dc '0-9')
DISK_TXT="$(df -h / --output=used,size,pcent | tail -1 | awk '{print $1" of "$2" used ("$3")"}')"
if [[ $DISK_PCT -lt 80 ]]; then okv "Disk (/)" "$DISK_TXT"; else bad "Disk (/)" "$DISK_TXT — clean up or resize soon"; fi

# Memory — warn above 90%
read -r MEM_USED MEM_TOTAL <<<"$(free -m | awk '/^Mem:/{print $3, $2}')"
MEM_PCT=$(( MEM_USED * 100 / MEM_TOTAL ))
if [[ $MEM_PCT -lt 90 ]]; then okv "Memory" "${MEM_USED}MB of ${MEM_TOTAL}MB used (${MEM_PCT}%)"; else bad "Memory" "${MEM_USED}MB of ${MEM_TOTAL}MB (${MEM_PCT}%) — investigate with htop"; fi

# Nginx
if systemctl is-active --quiet nginx 2>/dev/null; then okv "Nginx" "running"; else bad "Nginx" "NOT running — sudo systemctl start nginx"; fi

# Firewall
if sudo ufw status 2>/dev/null | grep -q "Status: active"; then okv "Firewall (UFW)" "active"; else bad "Firewall (UFW)" "INACTIVE — sudo ufw enable"; fi

# Fail2Ban
if systemctl is-active --quiet fail2ban 2>/dev/null; then okv "Fail2Ban" "running"; else bad "Fail2Ban" "NOT running — sudo systemctl start fail2ban"; fi

# PM2 apps (only if PM2 is installed)
if command -v pm2 >/dev/null; then
    ONLINE=$(pm2 jlist 2>/dev/null | grep -o '"status":"online"' | wc -l)
    ERRORED=$(pm2 jlist 2>/dev/null | grep -o '"status":"errored"' | wc -l)
    if [[ $ERRORED -eq 0 ]]; then okv "PM2 apps" "$ONLINE online, 0 errored"; else bad "PM2 apps" "$ERRORED errored — run: pm2 status"; fi
fi

line
# Tool versions
okv "Node" "$(node --version 2>/dev/null || echo 'not installed')"
okv "Python" "$(python3 --version 2>/dev/null | awk '{print $2}' || echo 'not installed')"
okv "Git" "$(git --version 2>/dev/null | awk '{print $3}' || echo 'not installed')"
line

if [[ $PROBLEMS -eq 0 ]]; then
    printf '\033[1;32mAll checks passed. ✔\033[0m\n\n'
else
    printf '\033[1;31m%d problem(s) found — see ✖ lines above.\033[0m\n\n' "$PROBLEMS"
    exit 1
fi
