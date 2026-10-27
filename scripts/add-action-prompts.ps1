param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

$mainNs = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"

function Read-ZipEntryText {
    param(
        [System.IO.Compression.ZipArchive]$Archive,
        [string]$EntryName
    )

    $entry = $Archive.GetEntry($EntryName)
    if (-not $entry) {
        throw "Missing workbook part: $EntryName"
    }

    $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8, $true)
    try {
        return $reader.ReadToEnd()
    }
    finally {
        $reader.Dispose()
    }
}

function Write-ZipEntryText {
    param(
        [System.IO.Compression.ZipArchive]$Archive,
        [string]$EntryName,
        [string]$Text
    )

    $existing = $Archive.GetEntry($EntryName)
    if ($existing) {
        $existing.Delete()
    }

    $entry = $Archive.CreateEntry($EntryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $writer = [System.IO.StreamWriter]::new($entry.Open(), [System.Text.UTF8Encoding]::new($false))
    try {
        $writer.Write($Text)
    }
    finally {
        $writer.Dispose()
    }
}

function New-NamespaceManager {
    param([System.Xml.XmlDocument]$Document)

    $manager = [System.Xml.XmlNamespaceManager]::new($Document.NameTable)
    $manager.AddNamespace("x", $mainNs)
    Write-Output -NoEnumerate $manager
}

function Get-CellText {
    param(
        [System.Xml.XmlElement]$Cell,
        [System.Xml.XmlNamespaceManager]$NamespaceManager
    )

    if (-not $Cell) {
        return ""
    }

    if ($Cell.t -eq "inlineStr") {
        return [string](($Cell.SelectNodes('.//x:t', $NamespaceManager) | ForEach-Object { $_.InnerText }) -join "")
    }

    $value = $Cell.SelectSingleNode('./x:v', $NamespaceManager)
    if ($value) {
        return [string]$value.InnerText
    }

    return ""
}

function Normalize-Text {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    return (($Value -replace '[\r\n\t]+', ' ') -replace '\s{2,}', ' ').Trim()
}

function Get-FormCue {
    param(
        [string]$EnglishName,
        [string]$TrainingType
    )

    $name = $EnglishName.ToLowerInvariant()
    if ($name -match 'stretch|mobility|yoga|pose') {
        return "Show the controlled end-range position without forcing the joints; the stretch line and balance points must read clearly."
    }
    if ($name -match 'plank|isometric|static hold|wall sit|l-sit|dead hang') {
        return "Show a stable isometric hold with a braced trunk, level alignment, and clearly supported contact points."
    }
    if ($name -match 'squat|lunge|split squat|step[- ]?up') {
        return "Make foot placement, knee tracking, hip depth, and upright balance unmistakable while preserving the referenced phase."
    }
    if ($name -match 'deadlift|romanian|good morning|hip hinge|kettlebell swing') {
        return "Emphasize a neutral spine, clear hip hinge, grounded feet, and the referenced load path."
    }
    if ($name -match 'press|push[- ]?up|dip') {
        return "Keep the pressing path, wrist-elbow-shoulder alignment, torso support, and equipment contact mechanically believable."
    }
    if ($name -match 'row|pulldown|pull[- ]?up|chin[- ]?up') {
        return "Make the grip, elbow path, shoulder-blade control, torso angle, and cable or machine direction easy to read."
    }
    if ($name -match 'curl') {
        return "Clearly show the correct joint doing the curl, stable proximal joints, the exact grip, and the referenced range position."
    }
    if ($name -match 'extension|kickback|pushdown') {
        return "Clearly show the extension path, stable supporting joints, exact grip, and final joint alignment from the reference."
    }
    if ($name -match 'raise|fly|flye|abduction|adduction') {
        return "Preserve the arm or leg plane, joint angle, stance, and controlled arc shown in the reference."
    }
    if ($name -match 'crunch|sit[- ]?up|leg raise|knee raise|rollout') {
        return "Make the trunk and pelvis relationship, abdominal brace, support points, and referenced range position anatomically clear."
    }
    if ($name -match 'run|jump|burpee|mountain climber|skipping|ski erg|jumping jack') {
        return "Freeze a dynamic but balanced phase with a clear direction of effort, credible weight transfer, and no motion blur."
    }
    if ($TrainingType -match 'timed|cardio') {
        return "Freeze the most recognizable balanced phase of the timed movement with a clear direction of effort and stable anatomy."
    }

    return "Preserve the exact representative phase and biomechanics visible in the reference, with stable joints and a clearly readable movement setup."
}

function New-ActionPrompt {
    param([hashtable]$Fields)

    $name = Normalize-Text $Fields.C
    $englishName = Normalize-Text $Fields.P
    $category = Normalize-Text $Fields.D
    $primary = Normalize-Text $Fields.E
    $secondary = Normalize-Text $Fields.F
    $equipmentCategory = Normalize-Text $Fields.G
    $equipment = Normalize-Text $Fields.H
    $trainingType = Normalize-Text $Fields.I
    $referencePath = Normalize-Text $Fields.L

    if (-not $englishName) {
        $englishName = $name
    }
    if (-not $primary) {
        $primary = $category
    }
    if (-not $secondary) {
        $secondary = "not specified"
    }
    if (-not $equipmentCategory) {
        $equipmentCategory = "not specified"
    }
    if (-not $equipment) {
        $equipment = "use only what is visible in the reference"
    }
    if (-not $trainingType) {
        $trainingType = "exercise"
    }

    $formCue = Get-FormCue -EnglishName $englishName -TrainingType $trainingType
    $referenceSentence = if ($referencePath) {
        "Use the corresponding source GIF at '$referencePath' as the authoritative visual reference."
    }
    else {
        "Use the corresponding source image supplied with this row as the authoritative visual reference."
    }

    $prompt = @(
        "Create a clean black-and-white fitness exercise instructional illustration for '$englishName' ('$name')."
        $referenceSentence
        "Reproduce the same athlete orientation, camera angle, grip, limb placement, equipment setup, and single representative exercise phase; do not substitute another exercise variation."
        "Catalog context: body region $category; primary target $primary; secondary target $secondary; equipment category $equipmentCategory; equipment noted $equipment; training type $trainingType. If the catalog lists alternatives, depict only the equipment actually shown in the reference."
        $formCue
        "Use anatomically correct adult proportions, safe joint alignment, believable weight and equipment contact, and clear exercise biomechanics. Show one athletic adult matching the reference subject, with the entire body and every relevant equipment part fully visible."
        "Art direction: professional exercise-manual line art; crisp thin black outlines; clean vector-like contours; restrained medium-gray cross-hatching for anatomy, depth, and target-muscle definition; high contrast; pure white background; centered composition with generous negative space; consistent line weight."
        "Output one static 16:9 landscape frame suitable for a 480 x 270 app asset. No color or red highlights, photorealism, 3D rendering, text, captions, labels, arrows, numbers, logos, watermark, border, UI, gym clutter, extra people, collage, repeated poses, motion blur, duplicate limbs, malformed hands, cropped body, or cropped equipment."
    ) -join " "

    if ($prompt.Length -gt 32767) {
        throw "Prompt exceeds Excel cell limit for action: $name"
    }

    return $prompt
}

function Add-InlineStringCell {
    param(
        [System.Xml.XmlDocument]$Document,
        [System.Xml.XmlElement]$Row,
        [string]$Reference,
        [string]$StyleIndex,
        [string]$Value
    )

    $cell = $Document.CreateElement("c", $mainNs)
    $cell.SetAttribute("r", $Reference)
    $cell.SetAttribute("s", $StyleIndex)
    $cell.SetAttribute("t", "inlineStr")
    $inlineString = $Document.CreateElement("is", $mainNs)
    $text = $Document.CreateElement("t", $mainNs)
    $text.InnerText = $Value
    [void]$inlineString.AppendChild($text)
    [void]$cell.AppendChild($inlineString)
    [void]$Row.AppendChild($cell)
}

$resolvedInput = (Resolve-Path $InputPath).Path
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$outputDirectory = Split-Path -Parent $resolvedOutput
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
Copy-Item -LiteralPath $resolvedInput -Destination $resolvedOutput -Force

$archive = [System.IO.Compression.ZipFile]::Open($resolvedOutput, [System.IO.Compression.ZipArchiveMode]::Update)
try {
    $sheetText = Read-ZipEntryText -Archive $archive -EntryName "xl/worksheets/sheet1.xml"
    $sheetDocument = [System.Xml.XmlDocument]::new()
    $sheetDocument.PreserveWhitespace = $true
    $sheetDocument.LoadXml($sheetText)
    $sheetNamespace = New-NamespaceManager -Document $sheetDocument

    $dimension = $sheetDocument.SelectSingleNode('/x:worksheet/x:dimension', $sheetNamespace)
    if (-not $dimension -or $dimension.ref -ne "A1:R1041") {
        throw "Unexpected main sheet dimensions: $($dimension.ref)"
    }
    $dimension.SetAttribute("ref", "A1:S1041")

    $columns = $sheetDocument.SelectSingleNode('/x:worksheet/x:cols', $sheetNamespace)
    if (-not $columns) {
        throw "Main sheet has no column definitions."
    }
    $promptColumn = $sheetDocument.CreateElement("col", $mainNs)
    $promptColumn.SetAttribute("width", "96")
    $promptColumn.SetAttribute("customWidth", "1")
    $promptColumn.SetAttribute("style", "9")
    $promptColumn.SetAttribute("min", "19")
    $promptColumn.SetAttribute("max", "19")
    [void]$columns.AppendChild($promptColumn)

    $rows = @($sheetDocument.SelectNodes('/x:worksheet/x:sheetData/x:row', $sheetNamespace))
    if ($rows.Count -ne 1041) {
        throw "Expected 1041 rows including header; found $($rows.Count)."
    }

    Add-InlineStringCell -Document $sheetDocument -Row $rows[0] -Reference "S1" -StyleIndex "8" -Value "prompt"
    $prompts = [System.Collections.Generic.List[string]]::new()
    $missingImages = [System.Collections.Generic.List[string]]::new()

    for ($index = 1; $index -lt $rows.Count; $index++) {
        $row = $rows[$index]
        $rowNumber = [int]$row.r
        $fields = @{}
        foreach ($letter in [char[]](65..82)) {
            $columnLetter = [string]$letter
            $cell = $row.SelectSingleNode("./x:c[@r='$columnLetter$rowNumber']", $sheetNamespace)
            $fields[$columnLetter] = Get-CellText -Cell $cell -NamespaceManager $sheetNamespace
        }

        if (-not $fields.B -or -not $fields.C) {
            throw "Missing action ID or name at row $rowNumber."
        }

        if ($fields.L) {
            $candidatePath = Join-Path (Split-Path -Parent $resolvedInput) ($fields.L -replace '/', '\')
            if (-not (Test-Path -LiteralPath $candidatePath)) {
                $missingImages.Add("$rowNumber|$($fields.B)|$($fields.C)|$($fields.L)")
            }
        }
        else {
            $missingImages.Add("$rowNumber|$($fields.B)|$($fields.C)|<blank>")
        }

        $prompt = New-ActionPrompt -Fields $fields
        $prompts.Add($prompt)
        Add-InlineStringCell -Document $sheetDocument -Row $row -Reference "S$rowNumber" -StyleIndex "7" -Value $prompt
    }

    $tableText = Read-ZipEntryText -Archive $archive -EntryName "xl/tables/table1.xml"
    $tableDocument = [System.Xml.XmlDocument]::new()
    $tableDocument.PreserveWhitespace = $true
    $tableDocument.LoadXml($tableText)
    $tableNamespace = New-NamespaceManager -Document $tableDocument
    $table = $tableDocument.SelectSingleNode('/x:table', $tableNamespace)
    $autoFilter = $tableDocument.SelectSingleNode('/x:table/x:autoFilter', $tableNamespace)
    $tableColumns = $tableDocument.SelectSingleNode('/x:table/x:tableColumns', $tableNamespace)
    if (-not $table -or $table.ref -ne "A1:R1041" -or -not $tableColumns -or $tableColumns.count -ne "18") {
        throw "Unexpected main table structure."
    }
    $table.SetAttribute("ref", "A1:S1041")
    $autoFilter.SetAttribute("ref", "A1:S1041")
    $tableColumns.SetAttribute("count", "19")
    $tableColumn = $tableDocument.CreateElement("tableColumn", $mainNs)
    $tableColumn.SetAttribute("id", "19")
    $tableColumn.SetAttribute("name", "prompt")
    [void]$tableColumns.AppendChild($tableColumn)

    Write-ZipEntryText -Archive $archive -EntryName "xl/worksheets/sheet1.xml" -Text $sheetDocument.OuterXml
    Write-ZipEntryText -Archive $archive -EntryName "xl/tables/table1.xml" -Text $tableDocument.OuterXml

    $uniquePromptCount = @($prompts | Sort-Object -Unique).Count
    $maxPromptLength = ($prompts | Measure-Object -Property Length -Maximum).Maximum
    $minPromptLength = ($prompts | Measure-Object -Property Length -Minimum).Minimum

    [pscustomobject]@{
        Output = $resolvedOutput
        Actions = $prompts.Count
        UniquePrompts = $uniquePromptCount
        MissingImages = $missingImages.Count
        MinPromptLength = $minPromptLength
        MaxPromptLength = $maxPromptLength
        OutputBytes = (Get-Item -LiteralPath $resolvedOutput).Length
    }

    if ($missingImages.Count -gt 0) {
        $missingImages | Select-Object -First 20 | ForEach-Object { Write-Warning "Missing image: $_" }
    }
}
finally {
    $archive.Dispose()
}
