$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$mobileRoot = Split-Path -Parent $PSScriptRoot
$resourceRoot = Join-Path $mobileRoot 'android/app/src/main/res'
$assetRoot = Join-Path $mobileRoot 'assets'
$source = [System.Drawing.Image]::FromFile((Join-Path $assetRoot 'icon.png'))
$background = [System.Drawing.ColorTranslator]::FromHtml('#08214A')

function New-IconBitmap([int]$size, [bool]$round = $false, [bool]$adaptive = $false) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Transparent)
        if ($round) {
            $mask = [System.Drawing.Drawing2D.GraphicsPath]::new()
            try {
                $mask.AddEllipse(0, 0, $size, $size)
                $graphics.SetClip($mask)
            } finally { $mask.Dispose() }
        }
        $brush = [System.Drawing.SolidBrush]::new($background)
        try { $graphics.FillRectangle($brush, 0, 0, $size, $size) }
        finally { $brush.Dispose() }
        # The source contains its own navy background. Keep the artwork intact,
        # with padding so its card stack fits Android's 66dp adaptive safe zone.
        $imageSize = if ($adaptive) { [int][Math]::Round($size * 82 / 108) } else { $size }
        $offset = ($size - $imageSize) / 2
        $graphics.DrawImage($source, [System.Drawing.RectangleF]::new($offset, $offset, $imageSize, $imageSize))
    } finally { $graphics.Dispose() }
    return ,$bitmap
}

try {
    foreach ($density in @(
        @{ Name = 'mdpi'; Scale = 1 },
        @{ Name = 'hdpi'; Scale = 1.5 },
        @{ Name = 'xhdpi'; Scale = 2 },
        @{ Name = 'xxhdpi'; Scale = 3 },
        @{ Name = 'xxxhdpi'; Scale = 4 }
    )) {
        $directory = Join-Path $resourceRoot ('mipmap-' + $density.Name)
        foreach ($variant in @('ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground')) {
            $adaptive = $variant -eq 'ic_launcher_foreground'
            $baseSize = if ($adaptive) { 108 } else { 48 }
            $size = [int]($baseSize * $density.Scale)
            $bitmap = New-IconBitmap $size ($variant -eq 'ic_launcher_round') $adaptive
            try { $bitmap.Save((Join-Path $directory ($variant + '.png')), [System.Drawing.Imaging.ImageFormat]::Png) }
            finally { $bitmap.Dispose() }
        }
    }

    # Generate a preview using Android's 72dp visible viewport of a 108dp layer.
    $layer = New-IconBitmap 432 $false $true
    $preview = [System.Drawing.Bitmap]::new(640, 240)
    $graphics = [System.Drawing.Graphics]::FromImage($preview)
    try {
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#101719'))
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        foreach ($shape in @('square', 'round')) {
            $x = if ($shape -eq 'square') { 20 } else { 240 }
            $mask = [System.Drawing.Drawing2D.GraphicsPath]::new()
            try {
                if ($shape -eq 'round') { $mask.AddEllipse($x, 20, 200, 200) }
                else { $mask.AddRectangle([System.Drawing.Rectangle]::new($x, 20, 200, 200)) }
                $graphics.SetClip($mask)
                $graphics.DrawImage($layer, [System.Drawing.Rectangle]::new($x, 20, 200, 200), 72, 72, 288, 288, [System.Drawing.GraphicsUnit]::Pixel)
                $graphics.ResetClip()
            } finally { $mask.Dispose() }
        }
        $graphics.DrawImage($layer, [System.Drawing.Rectangle]::new(490, 96, 48, 48), 72, 72, 288, 288, [System.Drawing.GraphicsUnit]::Pixel)
        $preview.Save((Join-Path $assetRoot 'launcher-preview.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $preview.Dispose(); $layer.Dispose() }
} finally { $source.Dispose() }

Write-Output 'Generated all five Android launcher densities and launcher-preview.png.'
