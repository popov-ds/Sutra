"""Nginx vhost SUTRAMAX_DOMAIN (default sutra.max.dreamer-soft.pro) + PUBLIC_BASE_URL.

SSH_PASS / SUTRAMAX_SSH_PASS, опционально CERTBOT_EMAIL.
"""
from __future__ import annotations

import getpass
import os
import re
import sys
import textwrap
from pathlib import Path

import paramiko

HOST = os.environ.get("SUTRAMAX_SSH_HOST", "168.113.171.219")
USER = os.environ.get("SUTRAMAX_SSH_USER", "root")
REMOTE = os.environ.get("SUTRAMAX_REMOTE", "/opt/SutraMaxBot")
DOMAIN = os.environ.get("SUTRAMAX_DOMAIN", "sutra.max.dreamer-soft.pro")
PUBLIC = f"https://{DOMAIN}"
COMPOSE = "docker-compose.vps.yml"
ROOT = Path(__file__).resolve().parents[2]

NGINX_SITE = f"/etc/nginx/sites-available/{DOMAIN}"
NGINX_ENABLED = f"/etc/nginx/sites-enabled/{DOMAIN}"


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


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 600) -> tuple[int, str, str]:
    print(f"$ {cmd[:110]}")
    _, o, e = c.exec_command(cmd, timeout=timeout)
    code = o.channel.recv_exit_status()
    out, err = o.read().decode(), e.read().decode()
    if out.strip():
        print(out[-4000:] if len(out) > 4000 else out)
    if err.strip() and code != 0:
        print(err[-2000:], file=sys.stderr)
    return code, out, err


def nginx_http_only() -> str:
    return textwrap.dedent(
        f"""\
        server {{
            listen 80;
            listen [::]:80;
            server_name {DOMAIN};

            client_max_body_size 4m;
            large_client_header_buffers 8 32k;

            location /support/ {{
                proxy_pass http://127.0.0.1:18083/;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                client_max_body_size 64k;
            }}

            location / {{
                proxy_pass http://127.0.0.1:18081;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_set_header Authorization $http_authorization;
                proxy_set_header X-Max-Init-Data $http_x_max_init_data;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }}
        }}
        """
    )


def nginx_example_path() -> Path:
    override = os.environ.get("SUTRAMAX_NGINX_EXAMPLE", "").strip()
    if override:
        return ROOT / "deploy" / "vps" / override
    return ROOT / "deploy" / "vps" / "nginx-sutra.max.dreamer-soft.conf.example"


def nginx_full_ssl() -> str:
    example = nginx_example_path()
    if not example.is_file():
        return nginx_http_only()
    lines = example.read_text(encoding="utf-8").splitlines()
    start = 0
    for i, line in enumerate(lines):
        if line.strip().startswith("server {"):
            start = i
            break
    text = "\n".join(lines[start:]) + "\n"
    text = re.sub(r"server_name\s+[\w.-]+;", f"server_name {DOMAIN};", text)
    text = re.sub(
        r"/etc/letsencrypt/live/[\w.-]+/",
        f"/etc/letsencrypt/live/{DOMAIN}/",
        text,
    )
    return text


def patch_env(c: paramiko.SSHClient) -> None:
    sftp = c.open_sftp()
    path = f"{REMOTE}/.env"
    try:
        with sftp.file(path, "r") as f:
            body = f.read().decode()
    except FileNotFoundError:
        raise SystemExit(f"Нет {path}")
    if re.search(r"^PUBLIC_BASE_URL=", body, re.M):
        body = re.sub(
            r"^PUBLIC_BASE_URL=.*$",
            f"PUBLIC_BASE_URL={PUBLIC}",
            body,
            count=1,
            flags=re.M,
        )
    else:
        body = f"PUBLIC_BASE_URL={PUBLIC}\n" + body
    with sftp.file(path, "w") as f:
        f.write(body)
    sftp.close()
    print(f"PUBLIC_BASE_URL={PUBLIC}")


def main() -> None:
    c = connect()
    try:
        ip = ""
        for query in (
            f"dig +short @8.8.8.8 {DOMAIN} A",
            f"dig +short @1.1.1.1 {DOMAIN} A",
            f"dig +short {DOMAIN} A",
        ):
            _, out, _ = run(c, query, timeout=30)
            for line in out.strip().splitlines():
                line = line.strip()
                if line and all(p.isdigit() for p in line.split(".")):
                    ip = line
                    break
            if ip:
                break
        if not ip:
            raise SystemExit(
                f"DNS {DOMAIN} не резолвится. В reg.ru (зона dreamer-soft.pro) "
                f"добавьте A-запись sutra.max → IP VPS."
            )
        print(f"DNS {DOMAIN} → {ip}")

        sftp = c.open_sftp()
        with sftp.file(NGINX_SITE, "w") as f:
            f.write(nginx_http_only())
        sftp.close()
        run(c, f"ln -sf {NGINX_SITE} {NGINX_ENABLED}")
        code, _, err = run(c, "nginx -t")
        if code != 0:
            raise SystemExit(err or "nginx -t failed")
        run(c, "systemctl reload nginx")

        _, cert_out, _ = run(
            c,
            f"test -f /etc/letsencrypt/live/{DOMAIN}/fullchain.pem && echo yes || echo no",
            timeout=15,
        )
        if "yes" not in cert_out:
            email = os.environ.get("CERTBOT_EMAIL", "").strip()
            if not email:
                _, em, _ = run(
                    c,
                    "certbot show_account 2>/dev/null | grep -m1 'Email contact' | sed 's/.*: //' || true",
                    timeout=30,
                )
                email = em.strip()
                if email.lower() in {"", "none"}:
                    email = ""
            if email:
                cert_cmd = (
                    f"certbot --nginx -d {DOMAIN} --non-interactive --agree-tos "
                    f"--redirect -m {email}"
                )
            else:
                cert_cmd = (
                    f"certbot --nginx -d {DOMAIN} --non-interactive --agree-tos "
                    f"--redirect --register-unsafely-without-email"
                )
            code, _, err = run(c, cert_cmd, timeout=300)
            if code != 0:
                raise SystemExit(f"certbot failed: {err}")
        else:
            sftp = c.open_sftp()
            with sftp.file(NGINX_SITE, "w") as f:
                f.write(nginx_full_ssl())
            sftp.close()
            code, _, err = run(c, "nginx -t")
            if code != 0:
                raise SystemExit(err or "nginx -t failed")
            run(c, "systemctl reload nginx")

        patch_env(c)
        run(
            c,
            f"cd {REMOTE} && COMPOSE_PROJECT_NAME=sutramaxbot "
            f"docker compose -f {COMPOSE} up -d --force-recreate bot",
            timeout=300,
        )
        run(
            c,
            f"sleep 2 && curl -sf --resolve {DOMAIN}:443:127.0.0.1 https://{DOMAIN}/health",
            timeout=30,
        )
        run(
            c,
            f"curl -sSI --resolve {DOMAIN}:443:127.0.0.1 https://{DOMAIN}/miniapp/ | head -5",
            timeout=30,
        )
        print("Готово.", PUBLIC)
        print(f"Кабинет MAX: Mini App {PUBLIC}/miniapp/, webhook POST {PUBLIC}/webhooks/max")
    finally:
        c.close()


if __name__ == "__main__":
    main()
