param()

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$mobileRoot = Split-Path -Parent $PSScriptRoot
$fontPath = Join-Path $mobileRoot "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"
$glyphMapPath = Join-Path $mobileRoot "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json"
$outputPath = Join-Path $mobileRoot "assets/map-markers"

if (-not (Test-Path -LiteralPath $fontPath)) {
  throw "Ionicons font not found at $fontPath. Run npm install first."
}

if (-not (Test-Path -LiteralPath $glyphMapPath)) {
  throw "Ionicons glyph map not found at $glyphMapPath. Run npm install first."
}

New-Item -ItemType Directory -Path $outputPath -Force | Out-Null

$glyphMap = Get-Content -LiteralPath $glyphMapPath -Raw | ConvertFrom-Json
$privateFonts = New-Object System.Drawing.Text.PrivateFontCollection
$privateFonts.AddFontFile($fontPath)
$fontFamily = $privateFonts.Families[0]

$categories = [ordered]@{
  "elderly-care" = "heart-outline"
  "gastronomy" = "restaurant-outline"
  "pets" = "paw-outline"
  "beauty" = "sparkles-outline"
  "assistance" = "bag-outline"
  "education" = "school-outline"
  "transport" = "car-outline"
  "entertainment" = "headset-outline"
  "cleaning" = "brush-outline"
  "security" = "shield-checkmark-outline"
  "repair" = "construct-outline"
  "it" = "desktop-outline"
  "gardening" = "leaf-outline"
  "childcare" = "happy-outline"
  "handyman" = "hammer-outline"
  "fallback" = "ellipse-outline"
}

$states = [ordered]@{
  "default" = "#4F8266"
  "selected" = "#E8A971"
}

function New-MarkerImage {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string]$FillHex,
    [Parameter(Mandatory = $true)][int]$GlyphCode
  )

  $bitmap = New-Object System.Drawing.Bitmap 104, 122, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bitmap.SetResolution(96, 96)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(45, 0, 0, 0))
  $fillBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($FillHex))
  $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 4
  $borderPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $shadowTail = @(
    (New-Object System.Drawing.PointF 35, 75),
    (New-Object System.Drawing.PointF 69, 75),
    (New-Object System.Drawing.PointF 52, 117)
  )
  $tail = @(
    (New-Object System.Drawing.PointF 35, 71),
    (New-Object System.Drawing.PointF 69, 71),
    (New-Object System.Drawing.PointF 52, 112)
  )

  $graphics.FillPolygon($shadowBrush, $shadowTail)
  $graphics.FillEllipse($shadowBrush, 10, 7, 84, 84)
  $graphics.FillPolygon($fillBrush, $tail)
  $graphics.DrawPolygon($borderPen, $tail)
  $graphics.FillEllipse($fillBrush, 10, 3, 84, 84)
  $graphics.DrawEllipse($borderPen, 10, 3, 84, 84)

  $font = New-Object System.Drawing.Font $fontFamily, 42, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $glyph = [char]$GlyphCode
  $graphics.DrawString($glyph, $font, $whiteBrush, (New-Object System.Drawing.RectangleF 10, 3, 84, 84), $format)

  $bitmap.Save($FilePath, [System.Drawing.Imaging.ImageFormat]::Png)

  $format.Dispose()
  $font.Dispose()
  $borderPen.Dispose()
  $whiteBrush.Dispose()
  $fillBrush.Dispose()
  $shadowBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

foreach ($category in $categories.GetEnumerator()) {
  $glyphCode = [int]$glyphMap.($category.Value)
  if ($glyphCode -le 0) {
    throw "Missing Ionicons glyph: $($category.Value)"
  }

  foreach ($state in $states.GetEnumerator()) {
    $filePath = Join-Path $outputPath "$($category.Key)-$($state.Key).png"
    New-MarkerImage -FilePath $filePath -FillHex $state.Value -GlyphCode $glyphCode
  }
}

$privateFonts.Dispose()
Write-Host "Generated $($categories.Count * $states.Count) category marker images in $outputPath"
