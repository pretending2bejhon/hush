# The Hush cap hook removal: the escape hatch for install-cap-hook.ps1. The owner runs it from an elevated
# Windows PowerShell:
#   powershell -NoProfile -ExecutionPolicy Bypass -File <repo>\tools\uninstall-cap-hook.ps1
# It removes only the hook entries that point at C:\Program Files\ClaudeCode\hush\cap-hook.mjs from
# C:\Program Files\ClaudeCode\managed-settings.json (after a backup), then deletes that one file and its folder.
# Every other managed setting stays. Restart Claude Code afterwards.
#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

$root = 'C:\Program Files\ClaudeCode'
$dir = Join-Path $root 'hush'
$target = Join-Path $dir 'cap-hook.mjs'
$settings = Join-Path $root 'managed-settings.json'

if (Test-Path -LiteralPath $settings) {
    $backup = "$settings.bak-$((Get-Date).ToString('yyyyMMdd-HHmmss'))"
    Copy-Item -LiteralPath $settings -Destination $backup
    $config = Get-Content -Raw -LiteralPath $settings | ConvertFrom-Json
    if ($config.PSObject.Properties['hooks']) {
        foreach ($p in @($config.hooks.PSObject.Properties)) {
            $kept = @()
            foreach ($group in @($p.Value)) {
                $ours = @(@($group.hooks) | Where-Object { ((@($_.command) + @($_.args)) -join ' ') -like '*ClaudeCode\hush\cap-hook.mjs*' })
                if ($ours.Count -eq 0) { $kept += $group }
            }
            if ($kept.Count -eq 0) { $config.hooks.PSObject.Properties.Remove($p.Name) } else { $config.hooks.($p.Name) = $kept }
        }
        if (@($config.hooks.PSObject.Properties).Count -eq 0) { $config.PSObject.Properties.Remove('hooks') }
    }
    $json = ConvertTo-Json -InputObject $config -Depth 32
    [System.IO.File]::WriteAllText($settings, $json, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "hook entries removed; previous file kept at $backup"
}
if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
if ((Test-Path -LiteralPath $dir) -and -not (Get-ChildItem -LiteralPath $dir -Force)) { Remove-Item -LiteralPath $dir -Force }
Write-Host 'Removed. Close every Claude Code window and terminal session and start Claude Code again.'
