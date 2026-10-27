param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-EntryText($archive, $name) {
    $entry = $archive.GetEntry($name)
    if (-not $entry) { throw "Missing entry: $name" }
    $reader = [IO.StreamReader]::new($entry.Open())
    try { $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Get-CellPayload($cell, $ns) {
    if (-not $cell) { return "<missing>" }
    $text = (($cell.SelectNodes('.//x:t', $ns) | ForEach-Object { $_.InnerText }) -join '')
    $valueNode = $cell.SelectSingleNode('./x:v', $ns)
    $formulaNode = $cell.SelectSingleNode('./x:f', $ns)
    $value = if ($valueNode) { $valueNode.InnerText } else { "" }
    $formula = if ($formulaNode) { $formulaNode.InnerText } else { "" }
    "$($cell.s)|$($cell.t)|$text|$value|$formula"
}

$source = [IO.Compression.ZipFile]::OpenRead((Resolve-Path $SourcePath).Path)
$output = [IO.Compression.ZipFile]::OpenRead((Resolve-Path $OutputPath).Path)
try {
    [xml]$sourceSheet = Read-EntryText $source 'xl/worksheets/sheet1.xml'
    [xml]$outputSheet = Read-EntryText $output 'xl/worksheets/sheet1.xml'
    [xml]$outputTable = Read-EntryText $output 'xl/tables/table1.xml'

    $sourceNs = [Xml.XmlNamespaceManager]::new($sourceSheet.NameTable)
    $sourceNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    $outputNs = [Xml.XmlNamespaceManager]::new($outputSheet.NameTable)
    $outputNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')

    $sourceRows = @($sourceSheet.SelectNodes('/x:worksheet/x:sheetData/x:row', $sourceNs))
    $outputRows = @($outputSheet.SelectNodes('/x:worksheet/x:sheetData/x:row', $outputNs))
    if ($sourceRows.Count -ne $outputRows.Count) { throw 'Row count changed.' }

    $changedOriginalCells = 0
    for ($rowIndex = 0; $rowIndex -lt $sourceRows.Count; $rowIndex++) {
        $rowNumber = [int]$sourceRows[$rowIndex].r
        foreach ($codePoint in 65..82) {
            $letter = [string][char]$codePoint
            $sourceCell = $sourceRows[$rowIndex].SelectSingleNode("./x:c[@r='$letter$rowNumber']", $sourceNs)
            $outputCell = $outputRows[$rowIndex].SelectSingleNode("./x:c[@r='$letter$rowNumber']", $outputNs)
            if ((Get-CellPayload $sourceCell $sourceNs) -cne (Get-CellPayload $outputCell $outputNs)) {
                $changedOriginalCells++
            }
        }
    }
    if ($changedOriginalCells -ne 0) { throw "$changedOriginalCells original cells changed." }

    $promptCells = @($outputSheet.SelectNodes('//x:c[starts-with(@r,"S")]', $outputNs))
    $prompts = foreach ($cell in $promptCells | Select-Object -Skip 1) {
        (($cell.SelectNodes('.//x:t', $outputNs) | ForEach-Object { $_.InnerText }) -join '')
    }
    $emptyPrompts = @($prompts | Where-Object { [string]::IsNullOrWhiteSpace($_) }).Count
    $uniquePrompts = @($prompts | Sort-Object -Unique).Count
    $gifReferencedPrompts = @($prompts | Where-Object { $_ -match "Use the corresponding source GIF at '" }).Count
    $fallbackPrompts = @($prompts | Where-Object { $_ -match 'source image supplied with this row' }).Count
    if ($promptCells.Count -ne 1041 -or $prompts.Count -ne 1040 -or $emptyPrompts -ne 0 -or $uniquePrompts -ne 1040) {
        throw 'Prompt completeness or uniqueness validation failed.'
    }

    $formulaErrors = 0
    foreach ($entry in $output.Entries | Where-Object { $_.FullName -like '*.xml' }) {
        $text = Read-EntryText $output $entry.FullName
        $formulaErrors += [regex]::Matches($text, '#REF!|#DIV/0!|#VALUE!|#NAME\?|#N/A').Count
    }

    $unreadableEntries = 0
    foreach ($entry in $output.Entries) {
        try {
            $stream = $entry.Open()
            try {
                $buffer = New-Object byte[] 8192
                while ($stream.Read($buffer, 0, $buffer.Length) -gt 0) { }
            }
            finally { $stream.Dispose() }
        }
        catch { $unreadableEntries++ }
    }

    [pscustomobject]@{
        Sheets = $outputSheet.worksheet.ParentNode.OuterXml.Length -gt 0
        WorkbookEntries = $output.Entries.Count
        UnreadableEntries = $unreadableEntries
        OriginalRows = $sourceRows.Count
        OriginalCellsChanged = $changedOriginalCells
        PromptCells = $promptCells.Count
        PromptRows = $prompts.Count
        UniquePrompts = $uniquePrompts
        EmptyPrompts = $emptyPrompts
        GifReferencedPrompts = $gifReferencedPrompts
        FallbackPrompts = $fallbackPrompts
        MinimumPromptLength = ($prompts | Measure-Object -Property Length -Minimum).Minimum
        MaximumPromptLength = ($prompts | Measure-Object -Property Length -Maximum).Maximum
        Dimension = $outputSheet.worksheet.dimension.ref
        TableRef = $outputTable.table.ref
        TableColumns = $outputTable.table.tableColumns.count
        FormulaErrorTokens = $formulaErrors
    }
}
finally {
    $source.Dispose()
    $output.Dispose()
}
