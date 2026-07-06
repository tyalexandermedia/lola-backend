# Lola Cloud — Security

What protects this server, why, and how to check it's still working.
All of this was applied by `setup/01-secure.sh`.

## The layers

| Layer | What it does | Check it |
|---|---|---|
| Non-root user | Daily work happens as `lola` (sudo when needed); root can't log in over SSH | `whoami` → not root |
| SSH keys only | Password logins disabled — stolen/guessed passwords are useless | `sudo sshd -T \| grep -E 'permitrootlogin\|passwordauthentication'` → both `no` |
| UFW firewall | Only ports 22 (SSH), 80 (HTTP), 443 (HTTPS) accept inbound traffic | `sudo ufw status verbose` → `Status: active` |
| Fail2Ban | 5 failed SSH logins in 10 min → IP banned 1 hour | `sudo fail2ban-client status sshd` |
| Auto security updates | Ubuntu installs security patches nightly without you | `systemctl status unattended-upgrades` |
| File permissions | `/opt/lola-cloud/backups` is owner-only (700); dotfiles blocked by Nginx | `ls -ld /opt/lola-cloud/backups` |

## Rules that keep it secure

1. **Never put secrets in git.** API keys and tokens go in `.env` files that are
   listed in `.gitignore`, or in `/opt/lola-cloud/infrastructure/env/` (create
   it `chmod 700`). Check before every commit: `git status` should never show
   a `.env`.
2. **Never `chmod 777` anything.** If Nginx can't read a site, the fix is
   `chmod 755` on directories and `644` on files.
3. **One SSH key per purpose.** Your laptop key logs into the VPS; the VPS's
   `~/.ssh/id_ed25519_github` key talks to GitHub. Don't copy private keys
   between machines.
4. **New person/machine needs access?** Add their public key to
   `~/.ssh/authorized_keys` — never share your private key or create password
   logins.
5. **Before opening a new port** (e.g. a database), ask whether it can stay
   bound to `127.0.0.1` instead. Only `sudo ufw allow <port>` if the internet
   truly needs to reach it.

## If you get locked out

Your VPS provider's dashboard has a **web console** (works even with SSH
broken). Log in there as root via the console, then fix `~/.ssh/authorized_keys`
or `sudo systemctl restart ssh`. The hardening config lives at
`/etc/ssh/sshd_config.d/99-lola-hardening.conf` — deleting that file and
running `sudo systemctl reload ssh` restores Ubuntu defaults (password auth)
temporarily while you repair keys.

## If you suspect a break-in

```bash
last -20                                # recent logins
sudo fail2ban-client status sshd        # ban history
sudo journalctl -u ssh --since "24 hours ago" | grep -i "accepted"
```

Unexpected accepted logins? Rotate immediately: replace `authorized_keys`
with only your current key, reboot, and rotate any API keys stored on the box.

## Monthly 5-minute audit

```bash
lola-health                     # everything green?
sudo apt update && sudo apt upgrade -y
sudo ufw status                 # still active, still only 22/80/443?
last -10                        # only your logins?
```
