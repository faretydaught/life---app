# Generates PWA icons using System.Drawing (no external tools)
$dirName = [string][char]0x751F + [string][char]0x6D3B + 'app'
$proj = Join-Path 'C:\Users\ASUS\Desktop' $dirName
$outDir = Join-Path $proj 'icons'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [double]$contentScale, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  # Gradient background
  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $c1 = [System.Drawing.Color]::FromArgb(91, 110, 224)
  $c2 = [System.Drawing.Color]::FromArgb(68, 83, 200)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 55.0)
  $g.FillRectangle($brush, $rect)

  # White donut ring
  $s = [double]$size * $contentScale
  $x = ([double]$size - $s) / 2
  $y = $x
  $penW = [single]($s * 0.10)
  $pen = New-Object System.Drawing.Pen([System.Drawing.Brushes]::White, $penW)
  $g.DrawEllipse($pen, [single]$x, [single]$y, [single]$s, [single]$s)

  # Yen symbol inside
  $fontSize = [single]($s * 0.46)
  $font = New-Object System.Drawing.Font('Microsoft YaHei', $fontSize,
    [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textRect = New-Object System.Drawing.RectangleF([single]$x, [single]($y - $s * 0.02),
    [single]$s, [single]$s)
  $g.DrawString([char]0x00A5, $font, [System.Drawing.Brushes]::White, $textRect, $sf)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host ("Saved: " + $path)
}

New-Icon 192 0.78 (Join-Path $outDir 'icon-192.png')
New-Icon 512 0.78 (Join-Path $outDir 'icon-512.png')
New-Icon 512 0.60 (Join-Path $outDir 'icon-maskable-512.png')
Write-Host 'All icons generated.'
