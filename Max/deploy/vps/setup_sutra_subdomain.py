"""Nginx vhost + PUBLIC_BASE_URL для Sutra MAX. SSH_PASS / SUTRAMAX_SSH_PASS, CERTBOT_EMAIL."""
from __future__ import annotations

import getpass
import os
import sys
import textwrap
from pathlib import Path

import paramiko

HOST = os.environ.get("SUTRAMAX_SSH_HOST", "168.113.171.219")
USER = os.environ.get("SUTRAMAX_SSH_USER", "root")
REMOTE = "/opt/SutraMaxBot"
DOMAIN = os.environ.get("SUTRAMAX_DOMAIN", "sutra.max.master-solver.ru")
PUBLIC = f"https://{DOMAIN}"
COMPOSE = "docker-compose.vps.yml"
ROOT = Path(__file__).resolve().parents[2]

NGINX_SITE = "/etc/nginx/sites-available/sutra-max-bot"
NGINX_ENABLED = "/etc/nginx/sites-enabled/sutra-max-bot"


def connect() -> paramiko.SSHClient:
    pwd = (
        os.environ.get("SUTRAMAX_SSH_PASS")
        or os.environ.get("SSH_PASS")
        or getpass.getpass(f"Пароль {USER}@{HOST}: ")
    )
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=pwd, timeout=60)
    return c


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 600) -> int:
    print(f"$ {cmd[:110]}")
    _, o, e = c.exec_command(cmd, timeout=timeout)
    code = o.channel.recv_exit_status()
    out, err = o.read().decode(), e.read().decode()
    if out.strip():
        print(out[-4000:] if len(out) > 4000 else out)
    if err.strip() and code != 0:
        print(err[-2000:], file=sys.stderr)
    return code


def nginx_http_only() -> str:
    return textwrap.dedent(
        f"""\
        server {{
            listen 80;
            listen [::]:80;
            server_name {DOMAIN};

            client_max_body_size 4m;
            large_client_header_buffers 8 32k;

            location / {{
                proxy_pass http://127.0.0.1:18081;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header Authorization $http_authorization;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }}
        }}
    """
    )


def main() -> None:
    example = ROOT / "deploy" / "vps" / "nginx-sutra.max.master-solver.conf.example"
    email = os.environ.get("CERTBOT_EMAIL", "")
    c = connect()
    try:
        sftp = c.open_sftp()
        with sftp.file(NGINX_SITE, "w") as f:
            f.write(nginx_http_only())
        sftp.close()
        run(c, f"ln -sf {NGINX_SITE} {NGINX_ENABLED}")
        if run(c, "nginx -t") != 0:
            sys.exit(1)
        run(c, "systemctl reload nginx")

        if email:
            run(
                c,
                f"certbot --nginx -d {DOMAIN} --non-interactive --agree-tos -m {email} "
                f"|| certbot certonly --nginx -d {DOMAIN} --non-interactive --agree-tos -m {email}",
                timeout=300,
            )
            if example.exists():
                sftp = c.open_sftp()
                with sftp.file(NGINX_SITE, "w") as f:
                    text = example.read_text(encoding="utf-8").replace(
                        "sutra.max.master-solver.ru", DOMAIN
                    )
                    f.write(text)
                sftp.close()
                if run(c, "nginx -t") != 0:
                    sys.exit(1)
                run(c, "systemctl reload nginx")

        run(
            c,
            f"grep -q '^PUBLIC_BASE_URL=' {REMOTE}/.env && "
            f"sed -i 's|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL={PUBLIC}|' {REMOTE}/.env || "
            f"echo PUBLIC_BASE_URL={PUBLIC} >> {REMOTE}/.env",
        )
        run(
            c,
            f"cd {REMOTE} && COMPOSE_PROJECT_NAME=sutramaxbot "
            f"docker compose -f {COMPOSE} up -d --force-recreate bot",
        )
        run(c, f"curl -sf http://127.0.0.1:18081/health")
        print(f"OK. PUBLIC_BASE_URL={PUBLIC}")
        print("В кабинете MAX: webhook POST …/webhooks/max, Mini App {PUBLIC}/miniapp/")
    finally:
        c.close()


if __name__ == "__main__":
    main()