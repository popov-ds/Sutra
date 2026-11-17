Add-Type -AssemblyName System.Drawing

$assets = Join-Path $PSScriptRoot '..\assets'
# Adaptive icon safe zone ≈ 66/108 of the mask; use 58% so edges are not clipped on round/squircle launchers.
$size = 1024
$scale = 0.58
$inner = [int][Math]::Round($size * $scale)
$bg = [System.Drawing.Color]::FromArgb(255, 13, 70, 55)
$files = @(
  @{ Name = 'icon.png'; TransparentForeground = $false },
  @{ Name = 'android-icon-foreground.png'; TransparentForeground = $true },
  @{ Name = 'android-icon-monochrome.png'; TransparentForeground = $false },
  @{ Name = 'favicon.png'; TransparentForeground = $false }
)

foreach ($entry in $files) {
  $file = $entry.Name
  $transparent = [bool]$entry.TransparentForeground
  $path = Join-Path $assets $file
  if (-not (Test-Path $path)) { continue }

  $loaded = [System.Drawing.Image]::FromFile($path)
  try {
    $source = New-Object System.Drawing.Bitmap $loaded
  } finally {
    $loaded.Dispose()
  }

  try {
    $canvas = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    try {
      if ($transparent) {
        $graphics.Clear([System.Drawing.Color]::Transparent)
      } else {
        $graphics.Clear($bg)
      }
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $x = [int](($size - $inner) / 2)
      $y = [int](($size - $inner) / 2)
      $graphics.DrawImage($source, $x, $y, $inner, $inner)
      $temp = Join-Path $assets "$file.padded"
      $canvas.Save($temp, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $graphics.Dispose()
      $canvas.Dispose()
    }
  } finally {
    $source.Dispose()
  }

  Remove-Item -Force $path
  Rename-Item $temp $file
  Write-Output "Padded $file"
}

Get-ChildItem (Join-Path $assets '*.tmp') -ErrorAction SilentlyContinue | Remove-Item -Force
