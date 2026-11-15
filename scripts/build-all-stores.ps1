$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot

& (Join-Path $here 'build-release.ps1') -Flavor rustore -Artifact apk @args
& (Join-Path $here 'build-release.ps1') -Flavor play -Artifact aab @args

Write-Output "Done: dist/rustore (APK), dist/play (AAB)"
