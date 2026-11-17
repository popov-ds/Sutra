param(
  [Parameter(Mandatory = $true)]
  [string]$BuildGradlePath
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $BuildGradlePath)) {
  throw "File not found: $BuildGradlePath"
}

$content = Get-Content -LiteralPath $BuildGradlePath -Raw
$updated = [regex]::Replace(
  $content,
  '(?m)^(\s*)versionCode\s+(\d+)\s*$',
  {
    param($m)
    $next = [int]$m.Groups[2].Value + 1
    "$($m.Groups[1].Value)versionCode $next"
  },
  1
)

if ($updated -eq $content) {
  throw 'versionCode line not found in build.gradle'
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($BuildGradlePath, $updated, $utf8NoBom)

if ($updated -match '(?m)^\s*versionCode\s+(\d+)') {
  Write-Output "versionCode=$Matches[1]"
}