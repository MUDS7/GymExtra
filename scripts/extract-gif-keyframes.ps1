param(
    [Parameter(Mandatory = $true)]
    [string]$WorkbookPath,
    [string]$OutputDirectory = "assets/images",
    [ValidateRange(8, 64)]
    [int]$AnalysisSize = 24,
    [ValidateRange(2, 120)]
    [int]$MaxFramesToAnalyze = 60,
    [switch]$ValidateOnly
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$resolvedWorkbookPath = (Resolve-Path (Join-Path $workspaceRoot $WorkbookPath)).Path
$resolvedOutputDirectory = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot $OutputDirectory))

function Read-ZipEntryText {
    param(
        [System.IO.Compression.ZipArchive]$Archive,
        [string]$EntryName
    )

    $entry = $Archive.GetEntry($EntryName)
    if (-not $entry) {
        return $null
    }

    $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8, $true)
    try {
        return $reader.ReadToEnd()
    }
    finally {
        $reader.Dispose()
    }
}

function Get-CellValue {
    param(
        [System.Xml.XmlElement]$Cell,
        [object[]]$SharedStrings
    )

    if (-not $Cell) {
        return ""
    }

    $valueNode = $Cell.SelectSingleNode('./*[local-name()="v"]')
    if ($Cell.t -eq "s" -and $valueNode) {
        return [string]$SharedStrings[[int]$valueNode.InnerText]
    }

    if ($Cell.t -eq "inlineStr") {
        return [string](($Cell.SelectNodes('.//*[local-name()="is"]//*[local-name()="t"]') | ForEach-Object {
            $_.InnerText
        }) -join "")
    }

    if ($valueNode) {
        return [string]$valueNode.InnerText
    }

    return ""
}

function Get-WorkbookMediaRows {
    param([string]$Path)

    $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $sharedStrings = @()
        $sharedText = Read-ZipEntryText -Archive $archive -EntryName "xl/sharedStrings.xml"
        if ($sharedText) {
            [xml]$sharedXml = $sharedText
            foreach ($item in $sharedXml.sst.si) {
                $sharedStrings += (($item.SelectNodes('.//*[local-name()="t"]') | ForEach-Object {
                    $_.InnerText
                }) -join "")
            }
        }

        [xml]$sheetXml = Read-ZipEntryText -Archive $archive -EntryName "xl/worksheets/sheet1.xml"
        $rows = @($sheetXml.SelectNodes('//*[local-name()="sheetData"]/*[local-name()="row"]'))
        if ($rows.Count -lt 2) {
            throw "The workbook's first sheet has no data rows."
        }

        $header = @{}
        foreach ($cell in $rows[0].SelectNodes('./*[local-name()="c"]')) {
            $column = $cell.r -replace '\d', ''
            $header[$column] = Get-CellValue -Cell $cell -SharedStrings $sharedStrings
        }
        if (-not $header["L"]) {
            throw "Column L does not have a header."
        }

        $mediaRows = [System.Collections.Generic.List[object]]::new()
        $blankPathRows = 0
        foreach ($row in $rows | Select-Object -Skip 1) {
            $cells = @{}
            foreach ($cell in $row.SelectNodes('./*[local-name()="c"]')) {
                $column = $cell.r -replace '\d', ''
                $cells[$column] = Get-CellValue -Cell $cell -SharedStrings $sharedStrings
            }

            $relativePath = ([string]$cells["L"]).Trim()
            $sourceId = ([string]$cells["B"]).Trim()
            $name = ([string]$cells["C"]).Trim()
            if (-not $sourceId -or -not $name) {
                throw "Workbook row $($row.r) is missing an action ID or name."
            }
            if (-not $relativePath) {
                $blankPathRows += 1
                continue
            }

            $normalizedRelativePath = $relativePath -replace '/', [System.IO.Path]::DirectorySeparatorChar
            $sourcePath = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot $normalizedRelativePath))
            $outputName = [System.IO.Path]::GetFileNameWithoutExtension($relativePath) + ".png"
            $mediaRows.Add([pscustomobject]@{
                Row = [int]$row.r
                SourceId = $sourceId
                Name = $name
                RelativePath = $relativePath
                SourcePath = $sourcePath
                OutputName = $outputName
            })
        }

        return [pscustomobject]@{
            TotalRows = $rows.Count - 1
            BlankPathRows = $blankPathRows
            MediaRows = $mediaRows.ToArray()
        }
    }
    finally {
        $archive.Dispose()
    }
}

function Get-SampledFrameIndexes {
    param(
        [int]$FrameCount,
        [int]$Maximum
    )

    if ($FrameCount -le $Maximum) {
        return @(0..($FrameCount - 1))
    }

    $indexes = [System.Collections.Generic.SortedSet[int]]::new()
    for ($i = 0; $i -lt $Maximum; $i++) {
        $position = [int][Math]::Round($i * ($FrameCount - 1) / ($Maximum - 1))
        [void]$indexes.Add($position)
    }
    return @($indexes)
}

function Get-FrameSignature {
    param(
        [System.Drawing.Image]$Image,
        [int]$Size
    )

    $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.Clear([System.Drawing.Color]::White)
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighSpeed
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::Bilinear
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighSpeed
            $graphics.DrawImage($Image, 0, 0, $Size, $Size)
        }
        finally {
            $graphics.Dispose()
        }

        $rectangle = [System.Drawing.Rectangle]::new(0, 0, $Size, $Size)
        $data = $bitmap.LockBits($rectangle, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        try {
            $bytes = [byte[]]::new([Math]::Abs($data.Stride) * $Size)
            [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
            return $bytes
        }
        finally {
            $bitmap.UnlockBits($data)
        }
    }
    finally {
        $bitmap.Dispose()
    }
}

function Get-SignatureDifference {
    param(
        [byte[]]$Reference,
        [byte[]]$Candidate
    )

    [long]$difference = 0
    for ($i = 0; $i -lt $Reference.Length; $i++) {
        $difference += [Math]::Abs([int]$Reference[$i] - [int]$Candidate[$i])
    }
    return [double]$difference / $Reference.Length
}

function Select-KeyFrameIndex {
    param(
        [System.Drawing.Image]$Image,
        [System.Drawing.Imaging.FrameDimension]$FrameDimension,
        [int]$FrameCount,
        [int]$Size,
        [int]$MaximumFrames
    )

    if ($FrameCount -le 1) {
        return 0
    }

    $indexes = Get-SampledFrameIndexes -FrameCount $FrameCount -Maximum $MaximumFrames
    [void]$Image.SelectActiveFrame($FrameDimension, 0)
    $reference = Get-FrameSignature -Image $Image -Size $Size
    $bestIndex = 0
    [double]$bestDifference = -1

    foreach ($index in $indexes) {
        [void]$Image.SelectActiveFrame($FrameDimension, $index)
        $signature = Get-FrameSignature -Image $Image -Size $Size
        $difference = Get-SignatureDifference -Reference $reference -Candidate $signature
        if ($difference -gt $bestDifference) {
            $bestDifference = $difference
            $bestIndex = $index
        }
    }

    return $bestIndex
}

function Save-GifKeyFrame {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [int]$Size,
        [int]$MaximumFrames
    )

    $image = [System.Drawing.Image]::FromFile($InputPath)
    try {
        $dimension = [System.Drawing.Imaging.FrameDimension]::new($image.FrameDimensionsList[0])
        $frameCount = $image.GetFrameCount($dimension)
        $keyFrameIndex = Select-KeyFrameIndex -Image $image -FrameDimension $dimension -FrameCount $frameCount -Size $Size -MaximumFrames $MaximumFrames
        [void]$image.SelectActiveFrame($dimension, $keyFrameIndex)

        $bitmap = [System.Drawing.Bitmap]::new($image.Width, $image.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.Clear([System.Drawing.Color]::Transparent)
                $graphics.DrawImageUnscaled($image, 0, 0)
            }
            finally {
                $graphics.Dispose()
            }
            $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $bitmap.Dispose()
        }

        return [pscustomobject]@{
            FrameCount = $frameCount
            KeyFrameIndex = $keyFrameIndex
            Width = $image.Width
            Height = $image.Height
        }
    }
    finally {
        $image.Dispose()
    }
}

$workbookData = Get-WorkbookMediaRows -Path $resolvedWorkbookPath
$pathRows = @($workbookData.MediaRows)
$missing = @($pathRows | Where-Object { -not (Test-Path -LiteralPath $_.SourcePath -PathType Leaf) })
if ($missing.Count -gt 0) {
    $examples = ($missing | Select-Object -First 10 | ForEach-Object { "Row $($_.Row): $($_.RelativePath)" }) -join [Environment]::NewLine
    throw "$($missing.Count) workbook paths do not resolve to local files:$([Environment]::NewLine)$examples"
}

$nonGif = @($pathRows | Where-Object { [System.IO.Path]::GetExtension($_.SourcePath) -notin @('.gif', '.GIF') })
$rows = @($pathRows | Where-Object { [System.IO.Path]::GetExtension($_.SourcePath) -in @('.gif', '.GIF') })

$uniqueSources = @($rows | Sort-Object SourcePath -Unique)
$outputCollisions = @($uniqueSources | Group-Object { $_.OutputName.ToLowerInvariant() } | Where-Object Count -gt 1)
if ($outputCollisions.Count -gt 0) {
    $names = ($outputCollisions | Select-Object -First 10 -ExpandProperty Name) -join ', '
    throw "Different GIF files would map to the same PNG filename: $names"
}

if ($ValidateOnly) {
    [pscustomobject]@{
        WorkbookRows = $workbookData.TotalRows
        BlankPathRows = $workbookData.BlankPathRows
        RowsWithImagePaths = $pathRows.Count
        NonGifPathRows = $nonGif.Count
        RowsWithGifPaths = $rows.Count
        UniqueGifFiles = $uniqueSources.Count
        DuplicatePathRows = $rows.Count - $uniqueSources.Count
        MissingFiles = $missing.Count
        OutputCollisions = $outputCollisions.Count
        OutputDirectory = $resolvedOutputDirectory
    }
    return
}

New-Item -ItemType Directory -Path $resolvedOutputDirectory -Force | Out-Null
$failures = [System.Collections.Generic.List[object]]::new()
$frameCounts = [System.Collections.Generic.List[int]]::new()
$processed = 0

foreach ($row in $uniqueSources) {
    $outputPath = Join-Path $resolvedOutputDirectory $row.OutputName
    try {
        $result = Save-GifKeyFrame -InputPath $row.SourcePath -OutputPath $outputPath -Size $AnalysisSize -MaximumFrames $MaxFramesToAnalyze
        $frameCounts.Add([int]$result.FrameCount)
        $processed += 1
        if (($processed % 100) -eq 0 -or $processed -eq $uniqueSources.Count) {
            Write-Progress -Activity "Extracting GIF keyframes" -Status "$processed / $($uniqueSources.Count)" -PercentComplete (($processed / $uniqueSources.Count) * 100)
            Write-Host "Generated $processed / $($uniqueSources.Count) images"
        }
    }
    catch {
        $failures.Add([pscustomobject]@{
            Row = $row.Row
            SourcePath = $row.SourcePath
            OutputPath = $outputPath
            Error = $_.Exception.Message
        })
    }
}
Write-Progress -Activity "Extracting GIF keyframes" -Completed

if ($failures.Count -gt 0) {
    $examples = ($failures | Select-Object -First 10 | ForEach-Object { "$($_.SourcePath): $($_.Error)" }) -join [Environment]::NewLine
    throw "$($failures.Count) GIF files failed to extract:$([Environment]::NewLine)$examples"
}

$outputFiles = @(Get-ChildItem -LiteralPath $resolvedOutputDirectory -File -Filter *.png)
[pscustomobject]@{
    WorkbookRows = $workbookData.TotalRows
    BlankPathRows = $workbookData.BlankPathRows
    RowsWithImagePaths = $pathRows.Count
    NonGifPathRows = $nonGif.Count
    RowsWithGifPaths = $rows.Count
    UniqueGifFiles = $uniqueSources.Count
    DuplicatePathRows = $rows.Count - $uniqueSources.Count
    GeneratedPngFiles = $processed
    TotalPngFilesInOutput = $outputFiles.Count
    MinimumFrameCount = ($frameCounts | Measure-Object -Minimum).Minimum
    MaximumFrameCount = ($frameCounts | Measure-Object -Maximum).Maximum
    OutputDirectory = $resolvedOutputDirectory
}
