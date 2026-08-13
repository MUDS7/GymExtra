param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath,

    [int]$Width = 480,
    [ValidateSet('AdaptiveInk', 'CleanGrayscale')]
    [string]$Method = 'AdaptiveInk',
    [int]$WindowRadius = 10,
    [double]$DetailStrength = 3.6,
    [double]$ToneStrength = 0.18
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$source = [System.Drawing.Bitmap]::new($InputPath)
try {
    $height = [int][Math]::Round($source.Height * $Width / $source.Width)
    $resized = [System.Drawing.Bitmap]::new(
        $Width,
        $height,
        [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
    )

    try {
        $graphics = [System.Drawing.Graphics]::FromImage($resized)
        try {
            $graphics.Clear([System.Drawing.Color]::White)
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.DrawImage($source, 0, 0, $Width, $height)
        }
        finally {
            $graphics.Dispose()
        }

        $pixelCount = $Width * $height
        $gray = New-Object 'int[]' $pixelCount
        for ($y = 0; $y -lt $height; $y++) {
            for ($x = 0; $x -lt $Width; $x++) {
                $color = $resized.GetPixel($x, $y)
                $index = ($y * $Width) + $x
                $gray[$index] = [int](0.299 * $color.R + 0.587 * $color.G + 0.114 * $color.B)
            }
        }

        # Summed-area table makes local brightness normalization inexpensive.
        $integralWidth = $Width + 1
        $integralHeight = $height + 1
        $integral = New-Object 'long[]' ($integralWidth * $integralHeight)
        for ($y = 0; $y -lt $height; $y++) {
            [long]$rowSum = 0
            for ($x = 0; $x -lt $Width; $x++) {
                $sourceIndex = ($y * $Width) + $x
                $rowSum += $gray[$sourceIndex]
                $integralIndex = (($y + 1) * $integralWidth) + ($x + 1)
                $aboveIndex = ($y * $integralWidth) + ($x + 1)
                $integral[$integralIndex] = $integral[$aboveIndex] + $rowSum
            }
        }

        $output = [System.Drawing.Bitmap]::new(
            $Width,
            $height,
            [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
        )
        try {
            for ($y = 0; $y -lt $height; $y++) {
                for ($x = 0; $x -lt $Width; $x++) {
                    $index = ($y * $Width) + $x
                    $value = $gray[$index]
                    $x1 = [Math]::Max(0, $x - $WindowRadius)
                    $x2 = [Math]::Min($Width - 1, $x + $WindowRadius)
                    $y1 = [Math]::Max(0, $y - $WindowRadius)
                    $y2 = [Math]::Min($height - 1, $y + $WindowRadius)

                    $bottomRight = (($y2 + 1) * $integralWidth) + ($x2 + 1)
                    $topRight = ($y1 * $integralWidth) + ($x2 + 1)
                    $bottomLeft = (($y2 + 1) * $integralWidth) + $x1
                    $topLeft = ($y1 * $integralWidth) + $x1
                    $area = ($x2 - $x1 + 1) * ($y2 - $y1 + 1)
                    $sum = $integral[$bottomRight] - $integral[$topRight] - $integral[$bottomLeft] + $integral[$topLeft]
                    $localMean = $sum / $area

                    if ($value -ge 238) {
                        $tone = 255
                    }
                    elseif ($Method -eq 'CleanGrayscale') {
                        # Preserve the source drawing exactly while lifting midtones
                        # and whitening the pale warm background pattern.
                        $normalized = [Math]::Max(0, [Math]::Min(1, $value / 238.0))
                        $tone = [int][Math]::Round(255 * [Math]::Pow($normalized, 0.72))
                    }
                    else {
                        $detailInk = [Math]::Max(0, ($localMean - $value - 2) * $DetailStrength)
                        $baseInk = [Math]::Max(0, (180 - $value) * $ToneStrength)
                        $ink = [Math]::Min(255, [Math]::Max($detailInk, $baseInk))
                        $tone = [int][Math]::Round(255 - $ink)
                    }
                    $output.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($tone, $tone, $tone))
                }
            }

            $outputDirectory = Split-Path -Parent $OutputPath
            if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) {
                New-Item -ItemType Directory -Path $outputDirectory | Out-Null
            }
            $output.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $output.Dispose()
        }
    }
    finally {
        $resized.Dispose()
    }
}
finally {
    $source.Dispose()
}

$file = Get-Item -LiteralPath $OutputPath
if ($file.Length -ge 100000) {
    throw "Output exceeds 100,000 bytes: $($file.Length)"
}

[pscustomobject]@{
    Path = $file.FullName
    Width = $Width
    Height = $height
    Bytes = $file.Length
}
