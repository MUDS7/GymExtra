param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath,

    [int]$MaxBytes = 99999,
    [int]$StartWidth = 480,
    [int]$MinimumWidth = 280,
    [int]$WidthStep = 20
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$source = [System.Drawing.Image]::FromFile($InputPath)
try {
    $temporaryPath = "$OutputPath.work.png"
    $saved = $false

    for ($width = $StartWidth; $width -ge $MinimumWidth; $width -= $WidthStep) {
        $height = [int][Math]::Round($source.Height * $width / $source.Width)
        $bitmap = [System.Drawing.Bitmap]::new(
            $width,
            $height,
            [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
        )

        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.Clear([System.Drawing.Color]::White)
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.DrawImage($source, 0, 0, $width, $height)
            }
            finally {
                $graphics.Dispose()
            }

            if (Test-Path -LiteralPath $temporaryPath) {
                Remove-Item -LiteralPath $temporaryPath
            }
            $bitmap.Save($temporaryPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $bitmap.Dispose()
        }

        $bytes = (Get-Item -LiteralPath $temporaryPath).Length
        if ($bytes -le $MaxBytes) {
            Move-Item -LiteralPath $temporaryPath -Destination $OutputPath -Force
            $saved = $true
            break
        }
    }

    if (-not $saved) {
        if (Test-Path -LiteralPath $temporaryPath) {
            Remove-Item -LiteralPath $temporaryPath
        }
        throw "Unable to reach $MaxBytes bytes without going below $MinimumWidth px."
    }
}
finally {
    $source.Dispose()
}

$output = [System.Drawing.Image]::FromFile($OutputPath)
try {
    [pscustomobject]@{
        Path = (Resolve-Path -LiteralPath $OutputPath).Path
        Width = $output.Width
        Height = $output.Height
        Bytes = (Get-Item -LiteralPath $OutputPath).Length
    }
}
finally {
    $output.Dispose()
}
