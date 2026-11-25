"""Заливка обновлений SutraMaxBot на VPS: файлы и пересборка Docker.

Пароль: SSH_PASS, SUTRAMAX_SSH_PASS или запрос при запуске.
Серверный .env, volume sutramax_data и /opt/solver не трогаем.
Путь на VPS по умолчанию: /opt/SutraMaxBot (переопределение: SUTRAMAX_REMOTE).

Зависимость (один раз): pip install paramiko

Запуск из каталога Max:
    python upload.py
    set SSH_HOST=168.113.171.219
    set SSH_PASS=...
    python upload.py
"""

from __future__ import annotations

import getpass
import os
import sys
from pathlib import Path

import paramiko

HOST = os.environ.get("SUTRAMAX_SSH_HOST") or os.environ.get("SSH_HOST", "168.113.171.219")
USER = os.environ.get("SUTRAMAX_SSH_USER") or os.environ.get("SSH_USER", "root")
REMOTE = os.environ.get("SUTRAMAX_REMOTE", "/opt/SutraMaxBot")
COMPOSE_FILE = "docker-compose.vps.yml"
COMPOSE_PROJECT = os.environ.get("SUTRAMAX_COMPOSE_PROJECT", "sutramaxbot")
HEALTH_PORT = int(os.environ.get("SUTRAMAX_HTTP_PORT", "18081"))

ROOT = Path(__file__).resolve().parent

PATHS = (
    "src",
    "sql",
    "miniapp",
    "deploy",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "Dockerfile",
    COMPOSE_FILE,
    ".env.example",
)

SKIP_DIRS = {"__pycache__", "node_modules", "dist", ".git", "data"}
SKIP_NAMES = {".env", ".env.local"}
SKIP_SUFFIXES = {".pyc", ".log"}


def run_soft(client: paramiko.SSHClient, command: str, timeout: int = 120) -> tuple[int, str, str]:
    print(f"$ {command[:100]}{'…' if len(command) > 100 else ''}")
    _stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode()
    err = stderr.read().decode()
    return code, out, err


def run(client: paramiko.SSHClient, command: str, timeout: int = 1800) -> str:
    print(f"$ {command[:100]}{'…' if len(command) > 100 else ''}")
    _stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode()
    err = stderr.read().decode()
    if code != 0:
        raise SystemExit(f"Команда завершилась с ошибкой ({code}): {command}\n{out}{err}")
    return out


def mkdir_p(sftp: paramiko.SFTPClient, path: str) -> None:
    current = ""
    for part in path.strip("/").split("/"):
        current += "/" + part
        try:
            sftp.stat(current)
        except FileNotFoundError:
            sftp.mkdir(current)


def should_skip_dir(local: Path) -> bool:
    if local.name not in SKIP_DIRS:
        return False
    try:
        rel = local.resolve().relative_to(ROOT.resolve())
    except ValueError:
        return False
    # Только корневые Max/data, Max/node_modules, … не miniapp/src/data
    return len(rel.parts) == 1


def upload_tree(sftp: paramiko.SFTPClient, local: Path, remote: str) -> None:
    if local.is_dir():
        if should_skip_dir(local):
            return
        mkdir_p(sftp, remote)
        for child in sorted(local.iterdir()):
            upload_tree(sftp, child, f"{remote}/{child.name}")
        return
    if local.name in SKIP_NAMES or local.suffix in SKIP_SUFFIXES:
        return
    parent = str(Path(remote).parent).replace("\\", "/")
    if parent and parent != ".":
        mkdir_p(sftp, parent)
    sftp.put(str(local), remote)
    print(remote)


def compose_prefix() -> str:
    return f"cd {REMOTE} && COMPOSE_PROJECT_NAME={COMPOSE_PROJECT} docker compose -f {COMPOSE_FILE}"


def main() -> None:
    password = (
        os.environ.get("SUTRAMAX_SSH_PASS")
        or os.environ.get("SSH_PASS")
        or getpass.getpass(f"Пароль {USER}@{HOST}: ")
    )
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Подключение к {USER}@{HOST}")
    client.connect(HOST, username=USER, password=password, timeout=60)

    if "docker" not in run(client, "command -v docker || true", timeout=30):
        raise SystemExit(
            "На сервере нет Docker. Первый раз: python deploy/vps/remote_deploy.py "
            "или загрузите проект и bash deploy/vps/install-on-server.sh"
        )

    sftp = client.open_sftp()
    try:
        print(f"Загрузка в {REMOTE}")
        mkdir_p(sftp, REMOTE)
        for name in PATHS:
            local = ROOT / name
            if not local.exists():
                print(f"Пропуск (нет локально): {name}")
                continue
            upload_tree(sftp, local, f"{REMOTE}/{name}")
    finally:
        sftp.close()

    print("Сборка и перезапуск контейнеров (серверный .env не меняем)")
    run(
        client,
        f"{compose_prefix()} build && {compose_prefix()} up -d",
        timeout=1800,
    )

    print(f"Ожидание /health на 127.0.0.1:{HEALTH_PORT} (до ~90 с)")
    health = ""
    for _attempt in range(1, 31):
        code, out, _err = run_soft(
            client,
            f"curl -sf http://127.0.0.1:{HEALTH_PORT}/health",
            timeout=15,
        )
        if code == 0 and out.strip() == "ok":
            health = "ok"
            break
        run(client, "sleep 3", timeout=10)
    print(f"health: {health or '(нет ответа)'}")

    _code, schema_ok, _err = run_soft(
        client,
        f"{compose_prefix()} exec -T postgres psql -U sutra -d sutra_max_bot -tAc "
        "\"SELECT CASE WHEN to_regclass('public.users') IS NOT NULL "
        "AND to_regclass('public.settings') IS NOT NULL THEN 'ok' ELSE 'legacy' END\"",
        timeout=60,
    )
    schema_ok = schema_ok.strip()
    print(f"db schema: {schema_ok or '(не удалось проверить)'}")
    if schema_ok == "legacy":
        print(
            "База всё ещё со старой схемой (нет users/settings). "
            "Пересоберите образ без кэша и перезапустите бота:\n"
            f"  {compose_prefix()} build --no-cache bot && {compose_prefix()} up -d\n"
            "Логи миграции: docker compose ... logs bot --tail=100"
        )

    if health != "ok":
        run(client, f"{compose_prefix()} ps -a", timeout=60)
        run(client, f"ss -tlnp | grep {HEALTH_PORT} || true", timeout=30)
        logs = run(client, f"{compose_prefix()} logs bot --tail=80", timeout=120)
        raise SystemExit(
            f"Не отвечает http://127.0.0.1:{HEALTH_PORT}/health.\n"
            "Проверьте MAX_BOT_TOKEN в /opt/SutraMaxBot/.env и логи bot.\n"
            + logs
        )

    client.close()
    print("Готово.")
    print(
        "HTTPS/nginx первый раз: python deploy/vps/setup_sutra_subdomain.py\n"
        f"Проверка снаружи: https://sutra.max.master-solver.ru/health (или ваш PUBLIC_BASE_URL)"
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)