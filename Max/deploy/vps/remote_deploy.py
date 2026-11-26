#!/usr/bin/env python3
"""Деплой SutraMaxBot на VPS. Пароль: SUTRAMAX_SSH_PASS или SSH_PASS."""
from __future__ import annotations

import io
import os
import secrets
import sys
import tarfile
from pathlib import Path

import paramiko

HOST = os.environ.get("SUTRAMAX_SSH_HOST", "168.113.171.219")
USER = os.environ.get("SUTRAMAX_SSH_USER", "root")
PASS = os.environ.get("SUTRAMAX_SSH_PASS") or os.environ.get("SSH_PASS", "")
REMOTE = "/opt/SutraMaxBot"
PUBLIC_BASE = os.environ.get(
    "SUTRAMAX_PUBLIC_BASE", "https://sutra.max.dreamer-soft.pro"
)

MAX_ROOT = Path(__file__).resolve().parents[2]
SKIP_DIRS = {"node_modules", "dist", ".git", "data"}
SKIP_FILES = {".env"}


def connect() -> paramiko.SSHClient:
    if not PASS:
        print("Set SUTRAMAX_SSH_PASS or SSH_PASS", file=sys.stderr)
        sys.exit(1)
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASS, timeout=60)
    return c


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 1800) -> str:
    print(f"$ {cmd[:120]}...")
    _, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    if out:
        print(out[-4000:] if len(out) > 4000 else out)
    if err:
        print(err[-2000:], file=sys.stderr)
    if code != 0:
        raise RuntimeError(f"exit {code}: {cmd}")
    return out


def build_tar() -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for path in MAX_ROOT.rglob("*"):
            rel = path.relative_to(MAX_ROOT)
            if set(rel.parts) & SKIP_DIRS:
                continue
            if path.name in SKIP_FILES:
                continue
            if path.is_dir():
                continue
            tar.add(path, arcname=str(rel).replace("\\", "/"))
    buf.seek(0)
    return buf.read()


def upload(c: paramiko.SSHClient, data: bytes) -> None:
    sftp = c.open_sftp()
    run(c, f"mkdir -p {REMOTE}")
    remote_tar = f"{REMOTE}/deploy-bundle.tar.gz"
    with sftp.file(remote_tar, "wb") as f:
        f.write(data)
    sftp.close()
    run(c, f"cd {REMOTE} && tar xzf deploy-bundle.tar.gz && rm deploy-bundle.tar.gz")


def write_env(c: paramiko.SSHClient) -> None:
    local_env = MAX_ROOT / ".env"
    token = ""
    launch_secret = ""
    supabase_url = ""
    supabase_anon = ""
    webhook_secret = ""
    token = os.environ.get("MAX_BOT_TOKEN", "").strip() or token
    launch_secret = os.environ.get("LAUNCH_TOKEN_SECRET", "").strip() or launch_secret
    supabase_url = os.environ.get("EXPO_PUBLIC_SUPABASE_URL", "").strip() or supabase_url
    supabase_anon = (
        os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY", "").strip() or supabase_anon
    )
    webhook_secret = os.environ.get("WEBHOOK_SECRET", "").strip() or webhook_secret
    for env_path in (local_env,):
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key, val = key.strip(), val.strip()
            if key == "MAX_BOT_TOKEN":
                token = val
            elif key == "LAUNCH_TOKEN_SECRET":
                launch_secret = val
            elif key == "EXPO_PUBLIC_SUPABASE_URL":
                supabase_url = val
            elif key == "EXPO_PUBLIC_SUPABASE_ANON_KEY":
                supabase_anon = val
            elif key == "WEBHOOK_SECRET":
                webhook_secret = val
    if not token:
        out = run(c, f"test -f {REMOTE}/.env && cat {REMOTE}/.env || true", timeout=30)
        for line in out.splitlines():
            if line.startswith("MAX_BOT_TOKEN=") and line.split("=", 1)[1].strip():
                token = line.split("=", 1)[1].strip()
            elif line.startswith("LAUNCH_TOKEN_SECRET=") and not launch_secret:
                launch_secret = line.split("=", 1)[1].strip()
        if not token:
            print("WARN: MAX_BOT_TOKEN empty — добавьте в /opt/SutraMaxBot/.env и recreate bot")
    if not launch_secret:
        launch_secret = secrets.token_urlsafe(32)

    pg_pass = ""
    promo_codes = ""
    out = run(c, f"test -f {REMOTE}/.env && cat {REMOTE}/.env || true", timeout=30)
    for line in out.splitlines():
        if line.startswith("POSTGRES_PASSWORD=") and line.split("=", 1)[1].strip():
            pg_pass = line.split("=", 1)[1].strip()
        if line.startswith("PROMO_CODES="):
            promo_codes = line.split("=", 1)[1].strip()
    if not pg_pass:
        pg_pass = secrets.token_urlsafe(24)

    body = f"""MAX_BOT_TOKEN={token}
PUBLIC_BASE_URL={PUBLIC_BASE}
HTTP_PORT=18081
WEBHOOK_SECRET={webhook_secret}
MAX_USE_POLLING=1
LAUNCH_TOKEN_SECRET={launch_secret}
EXPO_PUBLIC_SUPABASE_URL={supabase_url}
EXPO_PUBLIC_SUPABASE_ANON_KEY={supabase_anon}
POSTGRES_PASSWORD={pg_pass}
DATABASE_URL=postgresql://sutra:{pg_pass}@127.0.0.1:55433/sutra_max_bot
PROMO_CODES={promo_codes}
"""
    sftp = c.open_sftp()
    with sftp.file(f"{REMOTE}/.env", "w") as f:
        f.write(body)
    sftp.close()


def main() -> None:
    print(f"Packaging {MAX_ROOT}...")
    tarball = build_tar()
    print(f"Upload {len(tarball) // 1024} KiB -> {HOST}:{REMOTE}")

    c = connect()
    try:
        run(c, "command -v docker >/dev/null || (echo 'Install Docker first' && exit 1)")
        upload(c, tarball)
        write_env(c)
        run(
            c,
            f"cd {REMOTE} && COMPOSE_PROJECT_NAME=sutramaxbot "
            f"docker compose -f docker-compose.vps.yml build && "
            f"docker compose -f docker-compose.vps.yml up -d",
        )
        hc = run(
            c,
            "sleep 5; (curl -sf http://127.0.0.1:18081/health >/dev/null && echo OK) || echo FAIL",
            timeout=60,
        )
        if "OK" in hc:
            print("Bot up on 127.0.0.1:18081")
        else:
            print("Health not OK yet (часто нет MAX_BOT_TOKEN). docker logs sutramaxbot-bot-1")
        print("Run setup_sutra_subdomain.py for HTTPS nginx.")
    finally:
        c.close()


if __name__ == "__main__":
    main()