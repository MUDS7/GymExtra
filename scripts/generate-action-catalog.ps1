param(
    [string]$WorkbookPath = "训记_动作库_分类及媒体对应_图片路径已更新.xlsx",
    [string]$AssetRoot = "assets"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$resolvedWorkbookPath = (Resolve-Path (Join-Path $workspaceRoot $WorkbookPath)).Path
$resolvedAssetRoot = (Resolve-Path (Join-Path $workspaceRoot $AssetRoot)).Path

$categoryDefinitions = @(
    [pscustomobject]@{ id = "neck"; name = "颈部" },
    [pscustomobject]@{ id = "chest"; name = "胸" },
    [pscustomobject]@{ id = "warmup"; name = "热身动作" },
    [pscustomobject]@{ id = "back"; name = "背" },
    [pscustomobject]@{ id = "legs"; name = "腿" },
    [pscustomobject]@{ id = "glutes"; name = "臀部" },
    [pscustomobject]@{ id = "abs"; name = "腹部" },
    [pscustomobject]@{ id = "shoulders"; name = "肩" },
    [pscustomobject]@{ id = "cardio"; name = "有氧" },
    [pscustomobject]@{ id = "biceps"; name = "二头" },
    [pscustomobject]@{ id = "core"; name = "核心稳定" },
    [pscustomobject]@{ id = "triceps"; name = "三头" },
    [pscustomobject]@{ id = "traps"; name = "斜方肌" },
    [pscustomobject]@{ id = "calves"; name = "小腿" },
    [pscustomobject]@{ id = "forearms"; name = "前臂" },
    [pscustomobject]@{ id = "functional"; name = "功能性" },
    [pscustomobject]@{ id = "stretching"; name = "拉伸" },
    [pscustomobject]@{ id = "timed"; name = "计时动作" },
    [pscustomobject]@{ id = "full_body"; name = "全身" },
    [pscustomobject]@{ id = "tabata"; name = "Tabata" }
)

$categoryIds = @{}
foreach ($category in $categoryDefinitions) {
    $categoryIds[$category.name] = $category.id
}

function Read-ZipEntryText {
    param(
        [System.IO.Compression.ZipArchive]$Archive,
        [string]$EntryName
    )

    $entry = $Archive.GetEntry($EntryName)
    if (-not $entry) {
        return $null
    }

    $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8)
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

function Get-Fnv1aHash {
    param([string]$Value)

    [uint32]$hash = 2166136261
    foreach ($character in $Value.ToCharArray()) {
        [uint32]$xorValue = $hash -bxor [uint32][char]$character
        $hash = [uint32](([uint64]$xorValue * 16777619) % 4294967296)
    }

    return [uint32]$hash
}

function ConvertTo-JavaScriptJson {
    param([object]$Value)
    return ($Value | ConvertTo-Json -Depth 6 -Compress)
}

$archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedWorkbookPath)
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
    $workbookRows = @()
    foreach ($row in $sheetXml.SelectNodes('//*[local-name()="sheetData"]/*[local-name()="row"]') | Select-Object -Skip 1) {
        $cells = @{}
        foreach ($cell in $row.SelectNodes('./*[local-name()="c"]')) {
            $column = $cell.r -replace '\d', ''
            $cells[$column] = Get-CellValue -Cell $cell -SharedStrings $sharedStrings
        }

        if (-not $cells["B"] -or -not $cells["C"] -or -not $cells["D"]) {
            throw "动作库第 $($row.r) 行缺少动作 ID、名称或分类。"
        }

        if (-not $categoryIds.ContainsKey($cells["D"])) {
            throw "动作库第 $($row.r) 行包含未知分类：$($cells["D"])"
        }

        $workbookRows += [pscustomobject]@{
            sourceId = [string]$cells["B"]
            name = [string]$cells["C"]
            categoryId = [string]$categoryIds[$cells["D"]]
            equipmentCategory = [string]$cells["G"]
            trainingType = [string]$cells["I"]
        }
    }
}
finally {
    $archive.Dispose()
}

if ($workbookRows.Count -ne 1040) {
    throw "动作数量应为 1040，实际读取到 $($workbookRows.Count)。"
}

$duplicateSourceIds = $workbookRows | Group-Object sourceId | Where-Object Count -gt 1
if ($duplicateSourceIds) {
    throw "工作簿中存在重复动作 ID：$($duplicateSourceIds.Name -join ', ')"
}

$nameCounts = @{}
foreach ($group in ($workbookRows | Group-Object name)) {
    $nameCounts[$group.Name] = $group.Count
}

$assetFiles = Get-ChildItem -LiteralPath $resolvedAssetRoot -File -Filter "*-chatgpt-lineart.png"
$assetsBySourceId = @{}
foreach ($row in $workbookRows) {
    $suffix = "_$($row.sourceId)-chatgpt-lineart.png"
    $matches = @($assetFiles | Where-Object { $_.Name.EndsWith($suffix, [System.StringComparison]::OrdinalIgnoreCase) })
    if ($matches.Count -gt 1) {
        throw "动作 $($row.name)（$($row.sourceId)）匹配到多张图片。"
    }
    if ($matches.Count -eq 1) {
        $assetsBySourceId[$row.sourceId] = $matches[0]
    }
}

$usedIds = @{}
$actionDefinitions = @()
foreach ($row in $workbookRows) {
    $hashInput = if ($nameCounts[$row.name] -gt 1) {
        "$($row.name)|$($row.sourceId)"
    }
    else {
        $row.name
    }

    [uint32]$actionId = Get-Fnv1aHash $hashInput
    $collisionSuffix = 1
    while ($usedIds.ContainsKey([string]$actionId)) {
        $actionId = Get-Fnv1aHash "$hashInput|$collisionSuffix"
        $collisionSuffix += 1
    }
    $usedIds[[string]$actionId] = $true

    $hasCustomIcon = $assetsBySourceId.ContainsKey($row.sourceId)
    $iconPath = if ($hasCustomIcon) {
        "/assets/action-icons/$actionId.png"
    }
    else {
        "/assets/default-action.png"
    }

    $actionDefinitions += [ordered]@{
        id = [uint32]$actionId
        sourceId = $row.sourceId
        name = $row.name
        categoryId = $row.categoryId
        equipmentCategory = $row.equipmentCategory
        trainingType = $row.trainingType
        iconPath = $iconPath
        hasCustomIcon = $hasCustomIcon
    }
}

$categoryJson = ConvertTo-JavaScriptJson $categoryDefinitions
$actionJson = ConvertTo-JavaScriptJson $actionDefinitions
$catalogSource = @"
// 此文件由 scripts/generate-action-catalog.ps1 根据动作库工作簿生成，请勿手工修改。
const DEFAULT_ACTION_ICON_PATH = "/assets/default-action.png";
const ACTION_CATEGORIES = $categoryJson;
const ACTION_DEFINITIONS = $actionJson;

const ACTION_TABLE = ACTION_DEFINITIONS.map((action, order) => ({
  ...action,
  order,
  type: "action",
  iconCached: !action.hasCustomIcon
}));

module.exports = {
  ACTION_CATEGORIES,
  ACTION_TABLE,
  DEFAULT_ACTION_ICON_PATH
};
"@

$catalogTargets = @(
    (Join-Path $workspaceRoot "miniprogram/data/action-catalog.js"),
    (Join-Path $workspaceRoot "cloudfunctions/actionFunctions/actionCatalog.js"),
    (Join-Path $workspaceRoot "cloudfunctions/quickstartFunctions/actionCatalog.js")
)
foreach ($target in $catalogTargets) {
    [System.IO.File]::WriteAllText($target, $catalogSource, [System.Text.UTF8Encoding]::new($false))
}

$iconOutputDirectories = @(
    (Join-Path $workspaceRoot "cloudfunctions/actionFunctions/assets/action-icons"),
    (Join-Path $workspaceRoot "cloudfunctions/quickstartFunctions/assets/action-icons")
)
foreach ($directory in $iconOutputDirectories) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
}
$resizeScript = Join-Path $PSScriptRoot "resize-png-under-100k.ps1"
foreach ($action in $actionDefinitions | Where-Object hasCustomIcon) {
    $source = $assetsBySourceId[[string]$action.sourceId]
    foreach ($directory in $iconOutputDirectories) {
        $destination = Join-Path $directory "$($action.id).png"
        if ($source.Length -lt 100000) {
            Copy-Item -LiteralPath $source.FullName -Destination $destination -Force
        }
        else {
            & $resizeScript -InputPath $source.FullName -OutputPath $destination | Out-Null
        }
    }
}

[pscustomobject]@{
    Workbook = $resolvedWorkbookPath
    Categories = $categoryDefinitions.Count
    Actions = $actionDefinitions.Count
    CustomIcons = $assetsBySourceId.Count
    DefaultIcons = $actionDefinitions.Count - $assetsBySourceId.Count
    CatalogTargets = $catalogTargets.Count
    CloudIconTargets = $iconOutputDirectories.Count
}
