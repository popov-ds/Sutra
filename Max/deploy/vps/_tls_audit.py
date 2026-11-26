"""TLS / chain / nginx audit for sutra.max.dreamer-soft.pro"""
from __future__ import annotations

import os
import paramiko

HOST = "168.113.171.219"
PASS = os.environ.get("SUTRAMAX_SSH_PASS") or os.environ.get("SSH_PASS", "")


def main() -> None:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PASS, timeout=60)
    cmds = [
        "set -e; echo '=== sutra dreamer ==='; "
        "echo | openssl s_client -connect sutra.max.dreamer-soft.pro:443 "
        "-servername sutra.max.dreamer-soft.pro -showcerts 2>/dev/null "
        "| grep -E 'subject=|issuer=|Verify return code' ; "
        "echo | openssl s_client -connect sutra.max.dreamer-soft.pro:443 "
        "-servername sutra.max.dreamer-soft.pro 2>&1 | grep 'Certificate chain'",
        "echo '=== yoga dreamer (compare) ==='; "
        "echo | openssl s_client -connect yoga.telegram.dreamer-soft.pro:443 "
        "-servername yoga.telegram.dreamer-soft.pro 2>&1 "
        "| grep -E 'Verify return code|Certificate chain'",
        "ls -l /etc/letsencrypt/live/sutra.max.dreamer-soft.pro/",
        "head -5 /etc/letsencrypt/live/sutra.max.dreamer-soft.pro/fullchain.pem",
        "openssl x509 -in /etc/letsencrypt/live/sutra.max.dreamer-soft.pro/cert.pem -noout -subject -issuer -dates",
        "openssl crl2pkcs7 -nocrl -certfile /etc/letsencrypt/live/sutra.max.dreamer-soft.pro/chain.pem 2>/dev/null | openssl pkcs7 -print_certs -noout 2>/dev/null | grep subject || "
        "grep -c 'BEGIN CERTIFICATE' /etc/letsencrypt/live/sutra.max.dreamer-soft.pro/fullchain.pem",
        "sed -n '1,55p' /etc/nginx/sites-available/sutra.max.dreamer-soft.pro",
        "curl -4 -sS -m 8 -v https://sutra.max.dreamer-soft.pro/health 2>&1 | tail -20",
        "ss -tlnp | grep ':443'",
    ]
    for cmd in cmds:
        print(">", cmd[:120])
        _, o, e = c.exec_command(cmd, timeout=90)
        o.channel.recv_exit_status()
        out = o.read().decode()
        err = e.read().decode()
        if out.strip():
            print(out[-8000:] if len(out) > 8000 else out)
        if err.strip():
            print("stderr:", err[-2000:])
    c.close()


if __name__ == "__main__":
    main()