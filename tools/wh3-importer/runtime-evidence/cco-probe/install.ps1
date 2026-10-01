param(
    [ValidateSet('Install', 'Uninstall')][string]$Action = 'Install',
    [string]$GamePath,
    [string]$ExecDirectory,
    [string]$BundleDirectory,
    [ValidateSet('SMALL', 'MEDIUM', 'LARGE', 'ULTRA')][string]$UnitSize = 'MEDIUM',
    [switch]$SkipLogging
)
$ErrorActionPreference = 'Stop'
# Resolve from the existing ignored importer config; never embed a Steam path.
if (-not $GamePath) {
    $configPath = Join-Path $PSScriptRoot '../../.local/config.json'
    if (Test-Path -LiteralPath $configPath) { $GamePath = (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json).gamePath }
}
if (-not $ExecDirectory) {
    if (-not $GamePath) { throw 'Supply -GamePath or -ExecDirectory. No game path is guessed.' }
    $ExecDirectory = Join-Path $GamePath 'exec'
}
$targetDirectory = [IO.Path]::GetFullPath($ExecDirectory)
$targetFile = Join-Path $targetDirectory 'exec_battle.lua'
$stateFile = Join-Path $targetDirectory '.wv-cco-install.json'
$state = if (Test-Path -LiteralPath $stateFile) { Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json } else { $null }
if ($state -and $state.target -ne $targetFile) { throw 'Install state target mismatch.' }
if (Test-Path -LiteralPath $targetFile) {
    $actualHash = (Get-FileHash -LiteralPath $targetFile -Algorithm SHA256).Hash
    if (-not $state -or $actualHash -ne $state.sha256) { throw 'Existing exec_battle.lua is not an unchanged probe-owned file. Preserve it and choose another working-directory/exec location.' }
}
if ($Action -eq 'Uninstall') {
    if (-not $state) { Write-Output 'No probe installation found.'; return }
    if (Test-Path -LiteralPath $targetFile) { Remove-Item -LiteralPath $targetFile }
    if ($state.loggingOwned -and $state.loggingFlag -and (Test-Path -LiteralPath $state.loggingFlag)) {
        if ((Get-Item -LiteralPath $state.loggingFlag).Length -eq 0) { Remove-Item -LiteralPath $state.loggingFlag }
        else { Write-Output 'Logging marker changed; preserved.' }
    }
    Remove-Item -LiteralPath $stateFile
    Write-Output 'Probe-owned files removed. Leave the current battle to clear its in-memory F10 listener.'
    return
}
if (-not $BundleDirectory -or -not $GamePath) { throw 'Install requires -BundleDirectory and a game path/config for version verification.' }
$index = Get-Content -LiteralPath (Join-Path $BundleDirectory 'static-index.json') -Raw | ConvertFrom-Json
$manifest = Get-Content -LiteralPath (Join-Path $BundleDirectory 'static-candidates.json') -Raw | ConvertFrom-Json
if ($manifest.snapshotId -ne $index.snapshotId) { throw 'Candidate/index snapshot mismatch.' }
$exePath = Join-Path $GamePath 'Warhammer3.exe'
if (-not (Test-Path -LiteralPath $exePath)) { throw 'Warhammer3.exe missing; no game execution is attempted.' }
$actualVersion = [Diagnostics.FileVersionInfo]::GetVersionInfo($exePath).ProductVersion.Trim()
if ($actualVersion -ne $index.snapshot.gameVersion) { throw 'Installed game version changed; regenerate static evidence first.' }
# The mod checks a root file before exec/ fallback. Refuse a shadowing file.
$parentDirectory = Split-Path -Parent $targetDirectory
if ((Split-Path -Leaf $targetDirectory) -eq 'exec' -and (Test-Path -LiteralPath (Join-Path $parentDirectory 'exec_battle.lua'))) {
    throw 'Parent exec_battle.lua shadows exec/ fallback. Preserve it; select the actual execution directory explicitly.'
}
$sessionId = [guid]::NewGuid().ToString()
# Values are controlled version/hash/enum/UUID literals, not paths or user Lua.
$prelude = "WV_CCO_CONFIG = {sessionId = `"$sessionId`", gameVersion = `"$actualVersion`", gameVersionSource = `"INSTALLER_EXE_VERSION`", staticSnapshotId = `"$($index.snapshotId)`", unitSize = `"$($UnitSize.ToUpperInvariant())`", unitSizeSource = `"DECLARED_SETUP`", scenarioId = `"CCO_P0_CUSTOM_BATTLE`"}`n"
if ($index.snapshotId -notmatch '^[a-f0-9]{64}$' -or $actualVersion -notmatch '^[0-9.]+$') { throw 'Unsafe metadata literal.' }
$source = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'exec_battle.lua') -Raw
New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
[IO.File]::WriteAllText($targetFile, $prelude + $source, [Text.UTF8Encoding]::new($false))
$loggingFlag = [IO.Path]::GetFullPath((Join-Path $GamePath 'data/script/enable_console_logging'))
$loggingOwned = $state -and $state.loggingOwned -and $state.loggingFlag -eq $loggingFlag
if (-not $SkipLogging -and -not (Test-Path -LiteralPath $loggingFlag)) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $loggingFlag) | Out-Null
    [IO.File]::WriteAllText($loggingFlag, '')
    $loggingOwned = $true
}
$hash = (Get-FileHash -LiteralPath $targetFile -Algorithm SHA256).Hash
$record = @{ target = $targetFile; sha256 = $hash; sessionId = $sessionId; unitSize = $UnitSize.ToUpperInvariant(); gameVersion = $actualVersion; staticSnapshotId = $index.snapshotId; loggingFlag = $loggingFlag; loggingOwned = [bool]$loggingOwned }
[IO.File]::WriteAllText($stateFile, ($record | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
Write-Output "Installed $targetFile; Unit Size declaration $UnitSize; session $sessionId. F9 snapshots; then F10 traces. Set the game's actual Unit Size to match."
