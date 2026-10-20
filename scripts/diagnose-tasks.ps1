# DIAGNOSE THE BUSINESSOS BOOT TASKS  (run as Administrator)
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-tasks.ps1
#
# Read-only. Prints, for each expected task: existence, principal, every trigger
# with its type/enabled state, every action, and the ACL on the task file. It
# exists because a non-elevated shell cannot see a SYSTEM task that was created
# with a restrictive security descriptor -- `Get-ScheduledTask` returns nothing
# and `schtasks /query` says "Access is denied", which looks identical to the
# task not existing at all. Running this elevated is the only way to tell those
# two cases apart.

[CmdletBinding()]
param(
  [string[]]$TaskNames = @("BusinessOS-Platform", "BusinessOS-PlatformWatchdog")
)

$ErrorActionPreference = "Continue"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$elevated = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Host "elevated : $elevated"
Write-Host "user     : $($identity.Name)"
Write-Host ""

foreach ($name in $TaskNames) {
  Write-Host "=== $name ===" -ForegroundColor Cyan

  $t = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if (-not $t) {
    Write-Host "  NOT FOUND via Get-ScheduledTask" -ForegroundColor Red
    $raw = & schtasks /query /tn $name /fo LIST /v 2>&1
    Write-Host "  schtasks: $($raw -join ' | ')"
    Write-Host ""
    continue
  }

  Write-Host "  exists    : yes"
  Write-Host "  state     : $($t.State)"
  Write-Host "  principal : $($t.Principal.UserId)"
  Write-Host "  logonType : $($t.Principal.LogonType)"
  Write-Host "  runLevel  : $($t.Principal.RunLevel)"

  Write-Host "  triggers  : $($t.Triggers.Count)"
  foreach ($tr in $t.Triggers) {
    $cls = $tr.CimClass.CimClassName
    Write-Host "    - $cls enabled=$($tr.Enabled) interval=$($tr.Repetition.Interval) duration=$($tr.Repetition.Duration)"
  }
  $hasBoot = ($t.Triggers | Where-Object { $_.CimClass.CimClassName -eq "MSFT_TaskBootTrigger" }).Count -gt 0
  Write-Host "  bootTrigger present: $hasBoot" -ForegroundColor $(if ($hasBoot) { "Green" } else { "Red" })

  Write-Host "  actions   :"
  foreach ($a in $t.Actions) {
    Write-Host "    - $($a.Execute) $($a.Arguments)"
  }

  $info = Get-ScheduledTaskInfo -TaskName $name -ErrorAction SilentlyContinue
  if ($info) {
    Write-Host "  lastRun   : $($info.LastRunTime)  result=$($info.LastTaskResult)  nextRun=$($info.NextRunTime)"
  }

  # The task definition file. Its ACL explains why a non-elevated shell cannot
  # read the task even though it exists.
  $file = Join-Path "C:\Windows\System32\Tasks" $name
  if (Test-Path -LiteralPath $file) {
    Write-Host "  file      : $file"
    try {
      $acl = Get-Acl -LiteralPath $file
      Write-Host "    owner   : $($acl.Owner)"
      foreach ($ace in $acl.Access) {
        Write-Host "    ace     : $($ace.IdentityReference) $($ace.AccessControlType) $($ace.FileSystemRights)"
      }
    } catch {
      Write-Host "    ACL unreadable: $($_.Exception.Message)"
    }
  } else {
    Write-Host "  file      : not visible from this context"
  }

  Write-Host ""
}

Write-Host "Done."
