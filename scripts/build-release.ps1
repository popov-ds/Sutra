param(
  [ValidateSet('play', 'rustore')]
  [string]$Flavor = 'rustore',
  [ValidateSet('apk', 'aab', 'both')]
  [string]$Artifact = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

if (-not $Artifact) {
  $Artifact = if ($Flavor -eq 'play') { 'aab' } else { 'apk' }
}

$ninjaZip = Join-Path $PSScriptRoot 'ninja-win.zip'
$ninjaDir = Join-Path $PSScriptRoot 'ninja'
if (-not (Test-Path (Join-Path $ninjaDir 'ninja.exe'))) {
  Invoke-WebRequest -Uri 'https://github.com/ninja-build/ninja/releases/download/v1.12.1/ninja-win.zip' -OutFile $ninjaZip
  Expand-Archive -Force -Path $ninjaZip -DestinationPath $ninjaDir
}

$capFlavor = $Flavor.Substring(0, 1).ToUpperInvariant() + $Flavor.Substring(1)
$env:APP_DISTRIBUTION = $Flavor

$distFlavor = Join-Path (Join-Path $root 'dist') $Flavor
New-Item -ItemType Directory -Force -Path $distFlavor | Out-Null

function Copy-LatestArtifact {
  param(
    [string]$SourceDir,
    [string]$Filter,
    [string]$DestName
  )
  if (-not (Test-Path $SourceDir)) {
    throw "Gradle output folder not found: $SourceDir"
  }
  $file = Get-ChildItem -Path $SourceDir -Filter $Filter | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $file) {
    throw "No $Filter found in $SourceDir"
  }
  $dest = Join-Path $distFlavor $DestName
  Copy-Item -Force $file.FullName $dest
  Write-Output $dest
}

$gradleTasks = @()
if ($Artifact -eq 'apk' -or $Artifact -eq 'both') {
  $gradleTasks += "assemble${capFlavor}Release"
}
if ($Artifact -eq 'aab' -or $Artifact -eq 'both') {
  $gradleTasks += "bundle${capFlavor}Release"
}

Push-Location (Join-Path $root 'android')
try {
  foreach ($task in $gradleTasks) {
    .\gradlew $task @args
    if ($LASTEXITCODE -ne 0) { throw "Gradle $task failed with exit code $LASTEXITCODE" }
  }

  $written = @()
  if ($Artifact -eq 'apk' -or $Artifact -eq 'both') {
    $apkDir = Join-Path (Join-Path 'app\build\outputs\apk' $Flavor) 'release'
    $written += Copy-LatestArtifact -SourceDir $apkDir -Filter '*.apk' -DestName "Sutra-$Flavor-release.apk"
  }
  if ($Artifact -eq 'aab' -or $Artifact -eq 'both') {
    $aabDir = Join-Path (Join-Path 'app\build\outputs\bundle' $Flavor) 'release'
    $written += Copy-LatestArtifact -SourceDir $aabDir -Filter '*.aab' -DestName "Sutra-$Flavor-release.aab"
  }

  Write-Output "Release ($Flavor, $Artifact):"
  $written | ForEach-Object { Write-Output "  $_" }
} finally {
  Pop-Location
}
