# Lola Cloud — Server Inventory (SERVER.md)

The single source of truth for what the production server is. Update this
whenever the infrastructure changes.

## Instance

| Item | Value |
|---|---|
| Provider | AWS Lightsail |
| Instance name | Ubuntu-1 |
| Region / AZ | us-east-1 (Virginia) / us-east-1a |
| Size | 2 GB RAM · 2 vCPU · 60 GB SSD |
| OS | Ubuntu 24.04 LTS |
| Static IP | **98.95.48.64** (Lightsail "StaticIp-1", attached to Ubuntu-1) — permanent |
| First provisioned | 2026-07-06 (auto-bootstrap from this repo, branch claude/lola-cloud-vps-setup-k8cnhr) |

## Access

| Item | Value |
|---|---|
| Daily-driver user | `lola` (passwordless sudo) |
| Provider default user | `ubuntu` (kept; also has the instance key) |
| SSH auth | Key-only. Root login and password auth disabled (`/etc/ssh/sshd_config.d/99-lola-hardening.conf`) |
| Break-glass access | Lightsail console → browser SSH terminal (works even if keys are lost) |

## Network / firewall

| Layer | Rules |
|---|---|
| Lightsail firewall | 22 (SSH), 80 (HTTP), 443 (HTTPS — must be added manually in console) |
| UFW (on-server) | deny inbound by default; allow 22, 80, 443 |
| Fail2Ban | sshd jail: 5 fails in 10 min → 1h ban |

## Services

| Service | Managed by | Notes |
|---|---|---|
| Nginx | systemd | serves/proxies all client sites |
| Fail2Ban | systemd | |
| unattended-upgrades | systemd | nightly security patches |
| Client apps | PM2 (user lola) | survive reboot via pm2 startup + pm2 save |

## Scheduled jobs (user lola)

| When | What |
|---|---|
| 02:30 daily | `/opt/lola-cloud/scripts/backup.sh` → timestamped tar.gz, keeps 14 |
| 07:00 daily | `/opt/lola-cloud/scripts/health-check.sh` → appended to logs/health.log |

## Filesystem map

- `/opt/lola-cloud` — everything (see VPS_SETUP.md for the full tree)
- `/etc/nginx/sites-available` + `sites-enabled` — per-domain configs
- `/var/log/lola-bootstrap.log` — first-boot provisioning log
- `.env` files (secrets) — per-app, chmod 600, NEVER in git, NOT rebuilt by provisioning — see RECOVERY.md

## Cost

| Item | Monthly |
|---|---|
| Lightsail 2GB bundle | ~$12 |
| Static IP | free while attached |
| Snapshots (recommended) | ~$0.05/GB used |

Scaling path: 3 clients → nothing changes. 10 clients → same box, watch `lola-health` memory. 25+ → upgrade bundle via snapshot → larger instance (no redesign; everything lives in /opt/lola-cloud). 100+ → split web/apps across instances behind the same patterns.
