param(
  [ValidateSet('play', 'rustore')]
  [string]$Flavor = 'rustore'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

$ninjaZip = Join-Path $PSScriptRoot 'ninja-win.zip'
$ninjaDir = Join-Path $PSScriptRoot 'ninja'
if (-not (Test-Path (Join-Path $ninjaDir 'ninja.exe'))) {
  Invoke-WebRequest -Uri 'https://github.com/ninja-build/ninja/releases/download/v1.12.1/ninja-win.zip' -OutFile $ninjaZip
  Expand-Archive -Force -Path $ninjaZip -DestinationPath $ninjaDir
}

$capFlavor = $Flavor.Substring(0, 1).ToUpperInvariant() + $Flavor.Substring(1)
$env:APP_DISTRIBUTION = $Flavor
$env:EXPO_PUBLIC_DEV_TIER_TOOLS = '1'
$gradleTask = "assemble${capFlavor}Debug"

$distFlavor = Join-Path (Join-Path $root 'dist') $Flavor
New-Item -ItemType Directory -Force -Path $distFlavor | Out-Null

Push-Location (Join-Path $root 'android')
try {
  .\gradlew $gradleTask "-Psutra.embedDebugBundle=true" @args
  if ($LASTEXITCODE -ne 0) { throw "Gradle $gradleTask failed with exit code $LASTEXITCODE" }

  $apkDir = Join-Path (Join-Path 'app\build\outputs\apk' $Flavor) 'debug'
  $apk = Get-ChildItem -Path $apkDir -Filter '*.apk' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $apk) {
    throw "No debug APK found in $apkDir"
  }

  $out = Join-Path $distFlavor "Sutra-$Flavor-debug.apk"
  Copy-Item -Force $apk.FullName $out
  Write-Output "Debug APK ($Flavor): $out"
} finally {
  Pop-Location
}
