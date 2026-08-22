#!/usr/bin/env python3
"""
Secret guard — refuses to commit credentials, and can audit history on demand.

    python3 scripts/secret_guard.py --staged     # what the pre-commit hook runs
    python3 scripts/secret_guard.py --history    # scan every blob ever committed
    python3 scripts/secret_guard.py --files a b  # scan specific paths

── Why this exists ────────────────────────────────────────────────────────
On 2026-07-03 a `.env` holding four live Google API keys, the
LOLA_SECRET_ADMIN_KEY and a Make webhook URL was committed and pushed to a
PUBLIC repository, where it sat at the tip of the `gh-pages` branch for weeks.

`.gitignore` already listed `.env`. It did not help, because `git add -f`,
`git add -A` from a directory where the ignore rule doesn't apply, and agents
that stage explicit paths all bypass it. An ignore rule is a default, not a
control.

This is the control. It reads the actual staged CONTENT and refuses the commit,
so the class of mistake cannot repeat regardless of who or what is driving git.

── What it will not do ────────────────────────────────────────────────────
It does not phone home, does not write anything, and never prints a secret
value — only the file, the line number and which pattern matched. A tool that
echoes the credential into your terminal scrollback and CI logs has just
widened the exposure it was built to catch.

── Bypassing ──────────────────────────────────────────────────────────────
`git commit --no-verify` skips it, as it skips every hook. That is deliberate:
a guard you cannot override gets uninstalled the first time it is wrong. If you
find yourself using --no-verify twice for the same file, add it to ALLOWLIST
below with a comment saying why, so the exception is reviewed rather than
invisible.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

# ── patterns ───────────────────────────────────────────────────────────────
# Anchored with \b where the prefix is short, because an unanchored `re_`
# matched 10,559 times across this repo's history — every one a false positive
# inside an ordinary identifier. A scanner that cries wolf gets ignored.
PATTERNS: list[tuple[str, str]] = [
    ("Google API key",      r"\bAIza[0-9A-Za-z_\-]{35}\b"),
    ("Stripe live secret",  r"\bsk_live_[0-9A-Za-z]{20,}"),
    ("Stripe restricted",   r"\brk_live_[0-9A-Za-z]{20,}"),
    ("Stripe webhook",      r"\bwhsec_[0-9A-Za-z]{20,}"),
    ("Resend API key",      r"\bre_[0-9A-Za-z]{16,}\b"),
    ("SendGrid API key",    r"\bSG\.[0-9A-Za-z_\-]{20,}\.[0-9A-Za-z_\-]{20,}"),
    ("Brevo API key",       r"\bxkeysib-[0-9a-f]{40,}"),
    ("Anthropic API key",   r"\bsk-ant-[0-9A-Za-z_\-]{20,}"),
    ("OpenAI API key",      r"\bsk-(?:proj-)?[0-9A-Za-z_\-]{32,}"),
    ("GitHub token",        r"\bgh[pousr]_[0-9A-Za-z]{30,}"),
    ("Twilio account SID",  r"\bAC[0-9a-f]{32}\b"),
    ("GoHighLevel token",   r"\bpit-[0-9a-f]{8}-[0-9a-f]{4}"),
    ("AWS access key",      r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
    ("Slack token",         r"\bxox[baprs]-[0-9A-Za-z\-]{10,}"),
    ("Private key block",   r"-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----"),
    # Webhook URLs are bearer credentials: anyone holding the URL can POST to
    # it. The Make webhook in the leaked .env is exactly this shape, and a Make
    # scenario that sends email turns a leaked URL into a sending capability.
    ("Make webhook URL",    r"https://hook\.(?:eu|us)\d*\.make\.com/[0-9a-z]{10,}"),
    ("Zapier webhook URL",  r"https://hooks\.zapier\.com/hooks/catch/[0-9]+/[0-9a-z]+"),
    ("Slack webhook URL",   r"https://hooks\.slack\.com/services/T[0-9A-Z]+/B[0-9A-Z]+/[0-9A-Za-z]+"),
]

# Filenames that should never be committed regardless of content.
FORBIDDEN_NAMES = re.compile(
    r"(^|/)(\.env(\.(local|production|prod|dev|development))?|"
    r"secrets?\.(json|ya?ml|toml)|credentials\.json|"
    r"service[-_]account.*\.json|id_(rsa|ed25519)|.*\.pem|.*\.p12|.*\.pfx)$",
    re.I,
)

# Paths that are allowed to contain pattern-like strings.
ALLOWLIST = (
    "scripts/secret_guard.py",   # this file: the patterns themselves
    ".env.example",              # placeholders only, by definition
    "frontend/.env.example",
    "docs/",                     # runbooks quote record shapes, not values
)

# Values that look like credentials but are documentation.
PLACEHOLDER = re.compile(
    r"(your[-_]?(api[-_]?)?key|xxx+|<[^>]+>|\.\.\.|example|placeholder|"
    r"REDACTED|CHANGE[-_]?ME|TODO|whsec_\.\.\.|sk_live_\.\.\.)",
    re.I,
)

SKIP_SUFFIX = (
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".svg",
    ".woff", ".woff2", ".ttf", ".otf", ".pdf", ".zip", ".gz", ".mp4",
    ".lock", ".map",
)


def allowed(path: str) -> bool:
    return any(path == a or path.startswith(a) for a in ALLOWLIST)


def scan_text(path: str, text: str) -> list[str]:
    """Findings for one file. Never includes the matched value."""
    out: list[str] = []
    for lineno, line in enumerate(text.splitlines(), 1):
        if len(line) > 4000:            # minified bundle; not hand-authored
            continue
        for label, pat in PATTERNS:
            m = re.search(pat, line)
            if not m:
                continue
            if PLACEHOLDER.search(m.group(0)):
                continue
            out.append(f"{path}:{lineno}  {label}  (value withheld, {len(m.group(0))} chars)")
    return out


def staged_paths() -> list[str]:
    r = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        capture_output=True, text=True,
    )
    return [p for p in r.stdout.split("\n") if p.strip()]


def staged_content(path: str) -> str:
    r = subprocess.run(["git", "show", f":{path}"], capture_output=True, text=True)
    return r.stdout


def check_paths(paths: list[str], read) -> tuple[list[str], list[str]]:
    findings, forbidden = [], []
    for p in paths:
        if p.endswith(SKIP_SUFFIX) or "node_modules/" in p or "/dist/" in p:
            continue
        if FORBIDDEN_NAMES.search(p) and not allowed(p):
            forbidden.append(p)
            continue
        if allowed(p):
            continue
        try:
            findings.extend(scan_text(p, read(p)))
        except Exception:
            continue
    return findings, forbidden


def scan_history() -> int:
    """Every blob in every ref. Slow, deliberate — run it after an incident."""
    print("Scanning every blob in history. This takes a minute.\n")
    blobs = subprocess.run(
        ["git", "cat-file", "--batch-all-objects", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
        capture_output=True, text=True,
    ).stdout.splitlines()
    hits, n = [], 0
    for line in blobs:
        parts = line.split()
        if len(parts) != 3 or parts[1] != "blob" or int(parts[2]) > 200_000:
            continue
        n += 1
        body = subprocess.run(["git", "cat-file", "blob", parts[0]],
                              capture_output=True, text=True, errors="ignore").stdout
        for f in scan_text(parts[0][:12], body):
            hits.append(f)
    print(f"  {n} blobs scanned")
    if not hits:
        print("  ✓ no credentials found in history\n")
        return 0
    print(f"\n  ✗ {len(hits)} finding(s) — blob SHAs, inspect with `git cat-file blob <sha>`:\n")
    for h in sorted(set(hits)):
        print(f"    {h}")
    print("\n  A blob in history stays fetchable by SHA even after the branch is")
    print("  deleted. ROTATE the credential; deletion is cleanup, not a fix.\n")
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Refuse to commit credentials.")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--staged", action="store_true", help="scan the git index (pre-commit)")
    g.add_argument("--history", action="store_true", help="scan every blob ever committed")
    g.add_argument("--files", nargs="+", help="scan specific paths on disk")
    args = ap.parse_args()

    if args.history:
        return scan_history()

    if args.staged:
        findings, forbidden = check_paths(staged_paths(), staged_content)
    else:
        findings, forbidden = check_paths(args.files, lambda p: Path(p).read_text(errors="ignore"))

    if not findings and not forbidden:
        return 0

    print("\n\033[31m✗ COMMIT BLOCKED — credential material detected\033[0m\n", file=sys.stderr)
    for p in forbidden:
        print(f"  \033[31mforbidden file\033[0m  {p}", file=sys.stderr)
        print("                   this filename never belongs in git\n", file=sys.stderr)
    for f in findings:
        print(f"  \033[31m{f}\033[0m", file=sys.stderr)
    print(
        "\n  If any of this reached a remote, ROTATE it before anything else.\n"
        "  A pushed blob stays fetchable by SHA even after you delete the branch.\n\n"
        "  Genuinely a false positive? Add the path to ALLOWLIST in\n"
        "  scripts/secret_guard.py with a comment saying why.\n",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
