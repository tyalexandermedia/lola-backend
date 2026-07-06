#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# LOLA CLOUD — Amazon Lightsail launch script
#
# Paste this whole file into the "+ Add launch script" box when
# creating a Lightsail instance (OS Only → Ubuntu 24.04 LTS).
# The server sets itself up completely on first boot: security
# hardening, firewall, Fail2Ban, Node, Python, Nginx, Certbot, PM2,
# and the /opt/lola-cloud workspace. Same bootstrap as cloud-init.yaml,
# packaged as the plain shell script Lightsail expects.
#
# ALSO paste these 3 lines into the browser SSH terminal of an
# ALREADY-CREATED instance to run the same setup after the fact.
#
# After it finishes (~5-10 min): log in as 'lola' (or via the
# browser terminal) — a status banner reports every step.
# Log: /var/log/lola-bootstrap.log
#
# Don't forget, in the Lightsail console (Networking tab):
#   1. Attach a free Static IP (otherwise the IP changes on reboot)
#   2. Add firewall rule: HTTPS (TCP 443) — Lightsail blocks it by default
# ═══════════════════════════════════════════════════════════════════
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get install -y git
git clone --branch claude/lola-cloud-vps-setup-k8cnhr https://github.com/tyalexandermedia/lola-backend.git /root/lola-backend >> /var/log/lola-bootstrap.log 2>&1
bash /root/lola-backend/infra/vps/setup/bootstrap-cloudinit.sh >> /var/log/lola-bootstrap.log 2>&1
