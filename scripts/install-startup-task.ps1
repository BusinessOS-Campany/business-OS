# Registers the BusinessOS startup task so the stack comes back on its own.
#
# Run once (no elevation needed):
#     powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-startup-task.ps1
#
# Remove it with -Uninstall.
#
# What it creates: a per-user task, "BusinessOS-PlatformStartup", that runs
# scripts\platform-startup.ps1 at logon and then every 5 minutes as a safety net.
# Together with the existing "BusinessOS-PlatformWatchdog" task this means:
#
#   - PostgreSQL      Windows service, Automatic            (already handled)
#   - platform :3100  watchdog task (logon + 5 min)         (already present)
#   - tunnel          THIS task (logon + 5 min)             (the missing piece)
#
# The startup script is idempotent, so running alongside the watchdog is safe:
# it starts the platform only when the port is free, and leaves a bound-but-silent
# port to the watchdog rather than fighting it for the same process.

[CmdletBinding()]
param(
  [string]$TaskName = "BusinessOS-PlatformStartup",
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Script = Join-Path $Root "scripts\platform-startup.ps1"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed scheduled task: $TaskName"
  } else {
    Write-Host "Scheduled task not present: $TaskName"
  }
  exit 0
}

if (-not (Test-Path -LiteralPath $Script)) { throw "startup script not found: $Script" }

# Reuse the same per-user, non-elevated principal as the watchdog task: the script
# only touches the project folder and the user's own profile, so it needs no
# elevation and must not prompt for one.
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Script`"" `
  -WorkingDirectory $Root

$triggers = @(
  (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME)
)
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $triggers `
  -Settings $settings `
  -Description "Starts the Business OS platform and its Cloudflare tunnel after a reboot/logon. Idempotent; safe to run repeatedly." `
  -Force | Out-Null

# Add a repeating 5-minute trigger, mirroring the watchdog task's cadence, so a
# tunnel that dies mid-session is picked up even without a reboot.
$task = Get-ScheduledTask -TaskName $TaskName
$repeat = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes 5) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$task.Triggers += $repeat
$task | Set-ScheduledTask | Out-Null

Write-Host "Registered scheduled task: $TaskName"
Write-Host "  script : $Script"
Write-Host "  trigger: at logon, every 5 minutes"
Write-Host ""
Write-Host "Verify with:"
Write-Host "  Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo"
Write-Host "  powershell -NoProfile -File `"$Script`" -Check"
