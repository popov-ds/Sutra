"""Reinstall LE cert with ISRG Root X1 chain (older Android trust)."""
from __future__ import annotations

import os
import sys

import paramiko

HOST = "168.113.171.219"
DOMAIN = "sutra.max.dreamer-soft.pro"
PASS = os.environ.get("SUTRAMAX_SSH_PASS") or os.environ.get("SSH_PASS", "")
DRY = "--dry-run" in sys.argv


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 120) -> str:
    print(">", cmd[:100])
    _, o, e = c.exec_command(cmd, timeout=timeout)
    o.channel.recv_exit_status()
    out = o.read().decode()
    err = e.read().decode()
    if out.strip():
        print(out[-4000:])
    if err.strip():
        print("stderr:", err[-2000:])
    return out


def main() -> None:
    if not PASS:
        sys.exit("Set SUTRAMAX_SSH_PASS or SSH_PASS")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PASS, timeout=60)
    dry = " --dry-run" if DRY else ""
    run(
        c,
        f"certbot certonly --nginx -d {DOMAIN} --cert-name {DOMAIN} "
        f'--preferred-chain "ISRG Root X1" --reuse-key --non-interactive --agree-tos{dry}',
        timeout=180,
    )
    if not DRY:
        run(c, "nginx -t && systemctl reload nginx")
        run(
            c,
            f"openssl crl2pkcs7 -nocrl -certfile /etc/letsencrypt/live/{DOMAIN}/chain.pem "
            "| openssl pkcs7 -print_certs -noout | grep subject",
        )
    c.close()


if __name__ == "__main__":
    main()