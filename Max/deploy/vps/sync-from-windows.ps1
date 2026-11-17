# Синхронизация Max/ на VPS (не трогает /opt/solver и /opt/YogaShedulerTelegramBot).
#   $env:SUTRAMAX_SSH = "root@168.113.171.219"
#   .\deploy\vps\sync-from-windows.ps1

param(
  [string]$SshTarget = $env:SUTRAMAX_SSH,
  [string]$RemoteDir = "/opt/SutraMaxBot"
)

$ErrorActionPreference = "Stop"
$MaxRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

if (-not $SshTarget) {
  Write-Host "Задайте SUTRAMAX_SSH, например: root@168.113.171.219"
  exit 1
}

Write-Host "Источник: $MaxRoot"
Write-Host "SSH: $SshTarget -> ${RemoteDir}"

ssh $SshTarget "mkdir -p $RemoteDir"

if (-not (Get-Command rsync -ErrorAction SilentlyContinue)) {
  Write-Host "rsync не найден. Используйте: python deploy/vps/remote_deploy.py"
  exit 2
}

rsync -avz --delete `
  --exclude=node_modules --exclude=dist --exclude=.env --exclude=data --exclude=.git `
  "$MaxRoot/" "${SshTarget}:${RemoteDir}/"

Write-Host ""
Write-Host "На VPS:"
Write-Host "  cd $RemoteDir && cp -n .env.example .env && nano .env"
Write-Host "  bash deploy/vps/install-on-server.sh"