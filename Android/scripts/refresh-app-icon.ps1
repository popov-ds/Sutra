$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$source = Join-Path (Split-Path $root -Parent) 'Input\App.png'
if (-not (Test-Path $source)) {
  throw "Source icon not found: $source"
}

$assets = Join-Path $root 'assets'
foreach ($name in @('icon.png', 'android-icon-foreground.png', 'splash-icon.png', 'favicon.png')) {
  Copy-Item -Force $source (Join-Path $assets $name)
}

& (Join-Path $PSScriptRoot 'pad-icon.ps1')
Write-Output "Launcher assets updated."
Write-Output "Next: close Android Studio, run 'npx expo prebuild -p android --no-install', then npm run build:rustore"