param(
  [Parameter(Mandatory = $true)]
  [string]$AndroidProjectDir
)

$ErrorActionPreference = 'Stop'
$localProps = Join-Path $AndroidProjectDir 'local.properties'

function Write-AndroidSdkDir {
  param([string]$SdkPath)
  $escaped = ($SdkPath -replace '\\', '/')
  Set-Content -Path $localProps -Value "sdk.dir=$escaped" -Encoding Ascii
  Write-Output "Wrote local.properties -> sdk.dir=$escaped"
}

if (Test-Path $localProps) {
  $existing = Get-Content -Raw $localProps
  if ($existing -match 'sdk\.dir\s*=\s*(.+)') {
    $configured = $Matches[1].Trim() -replace '/', '\'
    if (Test-Path $configured) {
      return
    }
    Write-Output "local.properties sdk.dir missing on disk; rewriting..."
  }
}

$candidates = @(
  $env:ANDROID_HOME,
  $env:ANDROID_SDK_ROOT,
  (Join-Path $env:LOCALAPPDATA 'Android\Sdk'),
  (Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk')
) | Where-Object { $_ -and (Test-Path $_) }

$sdk = $candidates | Select-Object -First 1
if (-not $sdk) {
  throw @"
Android SDK not found.
Install Android Studio or the command-line tools, then set ANDROID_HOME
(or ensure %LOCALAPPDATA%\Android\Sdk exists).
Gradle needs sdk.dir in android\local.properties (recreated by this script when possible).
"@
}

Write-AndroidSdkDir $sdk