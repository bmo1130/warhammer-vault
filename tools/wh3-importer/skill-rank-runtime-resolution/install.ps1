param(
    [Parameter(Mandatory=$true)][string]$GamePath,
    [Parameter(Mandatory=$true)][string]$Bundle,
    [switch]$BackupExistingCampaignScript,
    [switch]$Uninstall
)
$ErrorActionPreference = 'Stop'
$game = (Resolve-Path -LiteralPath $GamePath).Path
$bundlePath = (Resolve-Path -LiteralPath $Bundle).Path
$target = Join-Path $game 'exec.lua'
$fallback = Join-Path $game 'exec\exec.lua'
$backupPath = Join-Path $game 'exec\wv-skill-rank-original.lua'
$statePath = Join-Path $game 'exec\wv-skill-rank-install.json'
$marker = Join-Path $game 'data\script\enable_console_logging'
function FileHash([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
    finally { $stream.Dispose(); $hasher.Dispose() }
}
if (Get-Process -Name Warhammer3 -ErrorAction SilentlyContinue) { throw 'Close the game before installation/removal.' }
if ($Uninstall) {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if ((FileHash $target) -ne $state.probeHash) { throw 'Probe changed; refusing removal.' }
    if ($state.originalHash -and (FileHash $backupPath) -ne $state.originalHash) { throw 'Original backup changed; refusing restoration.' }
    if ($state.createdMarker -and (Test-Path -LiteralPath $marker) -and (FileHash $marker) -ne $state.markerHash) { throw 'Logging marker changed; refusing removal.' }
    Remove-Item -LiteralPath $target
    if ($state.originalHash) { Move-Item -LiteralPath $backupPath -Destination $target }
    if ($state.createdMarker -and (Test-Path -LiteralPath $marker)) { Remove-Item -LiteralPath $marker }
    Remove-Item -LiteralPath $statePath
    return
}
$setup = Get-Content -LiteralPath (Join-Path $bundlePath 'setup.json') -Raw | ConvertFrom-Json
$version = (Get-Item -LiteralPath (Join-Path $game 'Warhammer3.exe')).VersionInfo.ProductVersion
if ($version -ne $setup.gameVersion) { throw "Version mismatch: installed $version / setup $($setup.gameVersion)" }
if ((Test-Path -LiteralPath $statePath) -or (Test-Path -LiteralPath $backupPath)) { throw 'Existing installation/backup found; uninstall it first.' }
if ((Test-Path -LiteralPath $fallback)) { throw 'Campaign fallback exec/exec.lua found; resolve its ownership before installing.' }
if ((Test-Path -LiteralPath $target) -and -not $BackupExistingCampaignScript) { throw 'Existing campaign exec.lua. Use -BackupExistingCampaignScript for reversible backup and replacement.' }
$source = Join-Path $bundlePath 'exec.lua'
$sourceHash = FileHash $source
$createdMarker = -not (Test-Path -LiteralPath $marker)
New-Item -ItemType Directory -Path (Join-Path $game 'exec') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $game 'data\script') -Force | Out-Null
$originalHash = $null
if (Test-Path -LiteralPath $target) {
    $originalHash = FileHash $target
    Copy-Item -LiteralPath $target -Destination $backupPath
    if ((FileHash $backupPath) -ne $originalHash) { throw 'Backup verification failed.' }
}
Copy-Item -LiteralPath $source -Destination $target
if ($createdMarker) { [System.IO.File]::WriteAllText($marker, '') }
@{probeHash=$sourceHash;originalHash=$originalHash;createdMarker=$createdMarker;markerHash=(FileHash $marker);gameVersion=$version;trialId=$setup.trialId} | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
Write-Output 'Campaign F9 installed. Enable the existing Script Debug Activator/loadfile mod. Battle F9/F10 files unchanged.'
