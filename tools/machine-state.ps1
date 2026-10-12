# The machine conditions X4 depends on, read before a perf run (tools/probe-perf.mjs): the power line, the
# energy saver and the power plan, the refresh rate of every active display, and the processes busy on the CPU
# and the GPU over a two-second sample. Prints one JSON line.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$ps = [System.Windows.Forms.SystemInformation]::PowerStatus
$saver = 'unknown'
try { $saver = [string][Windows.System.Power.PowerManager, Windows.System.Power, ContentType = WindowsRuntime]::EnergySaverStatus } catch { $saver = 'unknown' }
$scheme = (powercfg /getactivescheme) -join ' '
$rates = @(Get-CimInstance Win32_VideoController | Where-Object { $_.CurrentRefreshRate -gt 0 } | ForEach-Object { [int]$_.CurrentRefreshRate })
$cores = [Environment]::ProcessorCount
# A process that exits during the sample makes Get-Counter report an invalid sample: keep the valid ones, retry
# a sample that came back empty.
$cpu = $null
for ($try = 0; $try -lt 3 -and -not $cpu; $try++) { $cpu = Get-Counter '\Process(*)\% Processor Time' -SampleInterval 2 -MaxSamples 1 -ErrorAction SilentlyContinue }
if (-not $cpu) { throw 'no valid CPU sample in three tries' }
$busy = @($cpu.CounterSamples | Where-Object { $_.Status -eq 0 -and $_.InstanceName -ne '_total' -and $_.InstanceName -ne 'idle' } | Sort-Object CookedValue -Descending | Select-Object -First 8 | ForEach-Object { [ordered]@{ name = $_.InstanceName; cpu = [math]::Round($_.CookedValue / $cores, 1) } })
$gpu = @()
try {
  $g = Get-Counter '\GPU Engine(*engtype_3D)\Utilization Percentage' -MaxSamples 1
  $byPid = @{}
  foreach ($s in $g.CounterSamples) { if ($s.InstanceName -match 'pid_(\d+)_') { $byPid[$Matches[1]] = [double]$byPid[$Matches[1]] + $s.CookedValue } }
  $gpu = @($byPid.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5 | ForEach-Object {
    $p = Get-Process -Id ([int]$_.Key) -ErrorAction SilentlyContinue
    [ordered]@{ name = $(if ($p) { $p.ProcessName } else { 'pid ' + $_.Key }); gpu = [math]::Round($_.Value, 1) } })
} catch { $gpu = @() }
[ordered]@{ powerLine = [string]$ps.PowerLineStatus; energySaver = $saver; scheme = $scheme; refreshRates = $rates; cores = $cores; cpu = $busy; gpu = $gpu } | ConvertTo-Json -Compress -Depth 4
