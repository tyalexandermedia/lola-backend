# Lola Cloud — Disaster Recovery (RECOVERY.md)

What to do when things go wrong, worst-case first. Stay calm — almost
everything is rebuildable in ~20 minutes because provisioning is code.

## Locked out of SSH

1. Lightsail console → instance → browser terminal (bypasses your local keys).
2. Fix keys: `sudo nano /home/lola/.ssh/authorized_keys` (one `ssh-ed25519...` line per machine).
3. If hardening is the problem: `sudo rm /etc/ssh/sshd_config.d/99-lola-hardening.conf && sudo systemctl reload ssh` restores Ubuntu defaults temporarily. Re-apply via finish-setup.sh after fixing keys.

## Restore files from backup

```bash
lola-backup --list                       # see available archives
tar -tzf /opt/lola-cloud/backups/FILE | head        # inspect before extracting
tar -xzf /opt/lola-cloud/backups/FILE -C /opt/lola-cloud clients/NAME   # restore one client
```

## Whole server died / rebuild from scratch (~20 min)

1. Lightsail → Create instance → Ubuntu 24.04 → paste `infra/vps/lightsail-launch-script.sh` as launch script → same size.
2. Wait ~10 min; login banner should read ALL STEPS SUCCEEDED.
3. `sudo bash -c 'cd /root/lola-backend && git pull && bash infra/vps/scripts/finish-setup.sh'`
4. Re-clone client repos (04-github.sh), re-enable nginx sites, re-run certbot per domain.
5. Restore non-git data from the latest backup (see above) — or from a Lightsail snapshot.
6. Re-create `.env` files from your password manager (see below).
7. Move the Static IP to the new instance (Lightsail → Networking) — DNS follows automatically.

## What is NOT in git (must come from backups/snapshots/you)

- `.env` files and API keys (Resend, Google Maps, etc.) — keep copies in a password manager
- SSL certificates (regenerated free via certbot — not a loss)
- `/opt/lola-cloud/backups`, `logs`, generated `content/` and `reports/` — only in backups/snapshots

## Prevention (do these now)

- Enable Lightsail **snapshots** (console → instance → Snapshots → automatic).
- Keep every API key in a password manager the moment you create it.
- Weekly: pull one backup off-server (see BACKUPS.md).
