# Lola Cloud — Backups

## The one command

```bash
lola-backup            # make a backup now
lola-backup --list     # see what exists
```

What it does:

- Archives everything that matters — `clients/`, `templates/`, `blueprints/`,
  `agents/`, `seo/`, `content/`, `automation/`, `scripts/`, `docs/`,
  `deployments/`, `reports/`, `infrastructure/` — into one timestamped file:

  ```
  /opt/lola-cloud/backups/lola-cloud_2026-07-04_0230.tar.gz
  ```

- **Skips** regenerable bulk (`node_modules`, `.venv`, build caches, logs,
  old backups) so archives stay small.
- Keeps the **newest 14**, deletes older ones automatically.
- Logs each run to `/opt/lola-cloud/logs/backups.log`.

## Automate it (nightly at 2:30 AM)

```bash
crontab -e
```

Add this line, save, exit:

```
30 2 * * * /opt/lola-cloud/scripts/backup.sh >> /opt/lola-cloud/logs/backups.log 2>&1
```

Confirm it's registered: `crontab -l`

Cron format is `minute hour day month weekday` — so `30 2 * * *` = every day
at 02:30. Change to `30 2 * * 0` for weekly (Sundays) if disk space is tight.

## Restore

```bash
# See what's inside a backup first:
tar -tzf /opt/lola-cloud/backups/lola-cloud_DATE.tar.gz | head -30

# Restore ONE client folder (safest — restores into place):
tar -xzf /opt/lola-cloud/backups/lola-cloud_DATE.tar.gz \
    -C /opt/lola-cloud clients/sandbar-soft-wash

# Full restore (only onto a fresh/empty /opt/lola-cloud):
tar -xzf /opt/lola-cloud/backups/lola-cloud_DATE.tar.gz -C /opt/lola-cloud
```

Extraction **overwrites** files that exist with the same name — if unsure,
extract to a scratch folder first: `mkdir /tmp/restore && tar -xzf FILE -C /tmp/restore`.

## Important: get backups OFF the server too

These backups protect against mistakes (bad deploy, deleted file). They do
NOT protect against the server itself dying. Two cheap fixes, pick one:

1. **Provider snapshots** — most VPS providers offer automated whole-server
   snapshots for ~20% of the server cost. Turn them on in the dashboard.
   Easiest option, strongly recommended.
2. **Pull a copy to your computer** weekly (run on YOUR machine):
   ```bash
   scp lola-cloud:/opt/lola-cloud/backups/$(ssh lola-cloud 'ls -1t /opt/lola-cloud/backups | head -1') ~/LolaBackups/
   ```

Also remember: everything in git is already backed up on GitHub — the backup
archive mainly protects `.env` files, generated content, reports, and
anything not committed.
