#!/usr/bin/env bash
# Запускать НА VPS. Каталог: /opt/SutraMaxBot (не /opt/solver, не YogaSheduler).
set -euo pipefail

BOT_ROOT="${BOT_ROOT:-/opt/SutraMaxBot}"
COMPOSE_FILE="docker-compose.vps.yml"

echo "==> SutraMaxBot install in ${BOT_ROOT}"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^solver'; then
  echo "    (контейнер solver — не меняем его nginx/compose)"
fi

if ! command -v docker >/dev/null; then
  echo "Docker не установлен."
  exit 1
fi

mkdir -p "${BOT_ROOT}"
cd "${BOT_ROOT}"

if [[ ! -f .env ]]; then
  echo "Создайте ${BOT_ROOT}/.env из .env.example"
  cp -n .env.example .env 2>/dev/null || true
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Нет ${COMPOSE_FILE}. Скопируйте Max/ на сервер."
  exit 1
fi

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-sutramaxbot}"
docker compose -f "${COMPOSE_FILE}" build
docker compose -f "${COMPOSE_FILE}" up -d --force-recreate bot

echo ""
docker compose -f "${COMPOSE_FILE}" ps
echo ""
echo "Проверка: curl -sS http://127.0.0.1:18081/health"
echo "Nginx: deploy/vps/nginx-sutra.max.dreamer-soft.conf.example"