# The Hush cap hook install (PF-HOOK step 3). The owner runs it, and nobody else, from an elevated
# Windows PowerShell:
#   powershell -NoProfile -ExecutionPolicy Bypass -File <repo>\tools\install-cap-hook.ps1
# First compare the two sha256 values it prints with the ones in the spec session's final report.
# What it does, and nothing else:
#   1. makes C:\Program Files\ClaudeCode\hush\ writable by Administrators and SYSTEM only (Users read and run);
#   2. copies tools\cap-hook.mjs there;
#   3. registers that copy in C:\Program Files\ClaudeCode\managed-settings.json for PreToolUse, PostToolUse and
#      PostToolUseFailure on every tool, exec form (node plus the installed path), timeout 30 s, onFailure
#      "block", keeping every other managed setting and backing the old file up first.
# To undo it: tools\uninstall-cap-hook.ps1 from the same kind of prompt. Restart Claude Code after either.
#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repo 'tools\cap-hook.mjs'
$root = 'C:\Program Files\ClaudeCode'
$dir = Join-Path $root 'hush'
$target = Join-Path $dir 'cap-hook.mjs'
$settings = Join-Path $root 'managed-settings.json'
$events = @('PreToolUse', 'PostToolUse', 'PostToolUseFailure')
$node = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source

Write-Host "hook source   $source"
Write-Host "hook sha256   $((Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash.ToLower())"
Write-Host "script sha256 $((Get-FileHash -Algorithm SHA256 -LiteralPath $PSCommandPath).Hash.ToLower())"
Write-Host "node          $node"
Write-Host "installs to   $target"
Write-Host "registers in  $settings"
if ((Read-Host 'If both sha256 values match the report, type INSTALL') -cne 'INSTALL') {
    Write-Host 'Nothing changed.'
    exit 1
}

New-Item -ItemType Directory -Force -Path $dir | Out-Null
& icacls.exe $dir /inheritance:r /grant:r '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' | Out-Null
if ($LASTEXITCODE -ne 0) { throw "icacls on the folder failed (exit $LASTEXITCODE)" }
Copy-Item -LiteralPath $source -Destination $target -Force
& icacls.exe $target /reset | Out-Null
if ($LASTEXITCODE -ne 0) { throw "icacls on the hook failed (exit $LASTEXITCODE)" }

$backup = $null
if (Test-Path -LiteralPath $settings) {
    $backup = "$settings.bak-$((Get-Date).ToString('yyyyMMdd-HHmmss'))"
    Copy-Item -LiteralPath $settings -Destination $backup
    $config = Get-Content -Raw -LiteralPath $settings | ConvertFrom-Json
} else {
    $config = New-Object PSObject
}
if (-not $config.PSObject.Properties['hooks']) {
    $config | Add-Member -NotePropertyName hooks -NotePropertyValue (New-Object PSObject)
}
foreach ($e in $events) {
    $kept = @()
    if ($config.hooks.PSObject.Properties[$e]) {
        foreach ($group in @($config.hooks.$e)) {
            $ours = @(@($group.hooks) | Where-Object { ((@($_.command) + @($_.args)) -join ' ') -like '*ClaudeCode\hush\cap-hook.mjs*' })
            if ($ours.Count -eq 0) { $kept += $group }
        }
    }
    $hook = [pscustomobject][ordered]@{ type = 'command'; command = $node; args = @($target); timeout = 30; onFailure = 'block' }
    $kept += [pscustomobject][ordered]@{ matcher = '*'; hooks = @($hook) }
    if ($config.hooks.PSObject.Properties[$e]) { $config.hooks.$e = $kept }
    else { $config.hooks | Add-Member -NotePropertyName $e -NotePropertyValue $kept }
}
$json = ConvertTo-Json -InputObject $config -Depth 32
[System.IO.File]::WriteAllText($settings, $json, (New-Object System.Text.UTF8Encoding($false)))

# Read it back: every event must hold the matcher-all group with our exec-form, onFailure block entry.
$check = Get-Content -Raw -LiteralPath $settings | ConvertFrom-Json
foreach ($e in $events) {
    $found = @(@($check.hooks.$e) | Where-Object {
        $_.matcher -eq '*' -and @(@($_.hooks) | Where-Object { $_.onFailure -eq 'block' -and @($_.args) -contains $target }).Count -gt 0
    })
    if ($found.Count -eq 0) {
        if ($backup) { Copy-Item -LiteralPath $backup -Destination $settings -Force } else { Remove-Item -LiteralPath $settings -Force }
        throw "the registration for $e did not read back; the managed settings file was restored"
    }
}

Write-Host ''
Write-Host "installed sha256 $((Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash.ToLower())"
& icacls.exe $dir
& icacls.exe $target
if ($backup) { Write-Host "previous managed settings kept at $backup" }
Write-Host 'Registered. Now: close every Claude Code window and terminal session, start Claude Code again, and in a'
Write-Host 'terminal session run /status: it must name the managed settings file. If every tool call is suddenly'
Write-Host 'blocked with a hook error, run tools\uninstall-cap-hook.ps1 from an elevated prompt.'
