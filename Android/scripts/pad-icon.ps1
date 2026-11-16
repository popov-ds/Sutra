Add-Type -AssemblyName System.Drawing

$assets = Join-Path $PSScriptRoot '..\assets'
$size = 1024
$scale = 0.66
$inner = [int][Math]::Round($size * $scale)
$bg = [System.Drawing.Color]::FromArgb(255, 13, 70, 55)
$files = @('icon.png', 'android-icon-foreground.png', 'android-icon-monochrome.png', 'favicon.png')

foreach ($file in $files) {
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
      $graphics.Clear($bg)
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
