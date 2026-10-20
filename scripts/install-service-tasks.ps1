# REGISTER BUSINESSOS TO RUN WITHOUT ANYONE LOGGING IN  (run as Administrator, ONCE)
#
#   Right-click PowerShell -> "Run as administrator", then:
#     powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-service-tasks.ps1
#
#   Remove them again:
#     powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-service-tasks.ps1 -Uninstall
#
# Why this file exists next to install-startup-task.ps1: that one registers a
# per-user task, which only fires once the user logs on. A server that must serve
# while nobody is at the keyboard needs tasks that run at boot under SYSTEM, and
# registering those requires elevation.
#
# Two tasks are created, deliberately separate:
#
#   BusinessOS-Platform  starts the platform on :3100 + the Cloudflare tunnel at
#                        boot, then every 5 minutes (idempotent - it starts only
#                        what is not already running).
#   BusinessOS-PlatformWatchdog  already existed as a per-user task; here it is
#                        re-registered under SYSTEM so the health probe and
#                        rebuild/restart also run logged off. Otherwise a crash
#                        overnight would never be noticed until someone logged in.
#
# The per-user tasks from install-startup-task.ps1 are removed when this runs, so
# the two cannot both try to own :3100.

[CmdletBinding()]
param(
  [string]$PlatformTaskName = "BusinessOS-Platform",
  [string]$WatchdogTaskName = "BusinessOS-PlatformWatchdog",
  [string]$LegacyStartupTaskName = "BusinessOS-PlatformStartup",
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

# --- must be elevated -----------------------------------------------------
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "This script must run as Administrator." -ForegroundColor Red
  Write-Host "  Right-click PowerShell -> 'Run as administrator', then re-run it." -ForegroundColor Yellow
  exit 1
}

$Root = Split-Path -Parent $PSScriptRoot
$StartupScript = Join-Path $Root "scripts\platform-startup.ps1"
$WatchdogScript = Join-Path $Root "scripts\platform-watchdog.ps1"

if ($Uninstall) {
  foreach ($name in @($PlatformTaskName, $WatchdogTaskName)) {
    if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
      Unregister-ScheduledTask -TaskName $name -Confirm:$false
      Write-Host "Removed: $name"
    }
  }
  Write-Host ""
  Write-Host "The per-user task (if any) was left alone. Re-create it with:"
  Write-Host "  scripts\install-startup-task.ps1"
  exit 0
}

if (-not (Test-Path -LiteralPath $StartupScript)) { throw "missing: $StartupScript" }
if (-not (Test-Path -LiteralPath $WatchdogScript)) { throw "missing: $WatchdogScript" }

# --- drop the per-user tasks so only one thing owns :3100 -----------------
foreach ($name in @($LegacyStartupTaskName)) {
  if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "Removed per-user task: $name"
  }
}

function Register-BootTask {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [string]$Description,
    [int]$EveryMinutes = 5
  )

  $action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
    -WorkingDirectory $Root

  # AtStartup is what makes this work with nobody logged in. The 5-minute
  # repetition covers a process that dies during the day.
  $triggers = @(
    (New-ScheduledTaskTrigger -AtStartup),
    (New-ScheduledTaskTrigger -Once -At (Get-Date) `
      -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
      -RepetitionDuration (New-TimeSpan -Days 3650))
  )

  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

  # SYSTEM: no password to store, starts before any user logs on. The scripts only
  # touch the project folder and read the tunnel credential inside it, both of
  # which SYSTEM can access.
  $princ = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

  Register-ScheduledTask -TaskName $Name -Action $action -Trigger $triggers `
    -Settings $settings -Principal $princ -Description $Description -Force -ErrorAction Stop | Out-Null

  # Read the task back. A previous run printed "Registered:" for a task that was
  # never actually there, so the claim is now only made after the task is proven
  # to exist with the right principal. A silent failure here is the difference
  # between a server that survives a reboot and one that does not.
  $check = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
  if (-not $check) {
    throw "Registration of '$Name' reported success but the task is not present."
  }
  if ($check.Principal.UserId -ne "SYSTEM") {
    throw "Task '$Name' registered with principal '$($check.Principal.UserId)', expected SYSTEM."
  }
  $hasBootTrigger = ($check.Triggers | Where-Object { $_.CimClass.CimClassName -eq "MSFT_TaskBootTrigger" }).Count -gt 0
  if (-not $hasBootTrigger) {
    throw "Task '$Name' has no boot trigger, so it would not start without a logon."
  }

  # A SYSTEM task gets a security descriptor that denies the interactive user read
  # access, so `Get-ScheduledTask` from a normal shell returns nothing and
  # `schtasks /query` answers "Access is denied" -- indistinguishable from the
  # task not existing. Grant the local users read+execute on the task file so it
  # can be inspected and managed without elevation.
  $taskFile = Join-Path "C:\Windows\System32\Tasks" $Name
  if (Test-Path -LiteralPath $taskFile) {
    try {
      $acl = Get-Acl -LiteralPath $taskFile
      $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        "BUILTIN\Users", "ReadAndExecute", "Allow")
      $acl.SetAccessRule($rule)
      Set-Acl -LiteralPath $taskFile -AclObject $acl
      Write-Host "  granted BUILTIN\Users read access on the task" -ForegroundColor DarkGray
    } catch {
      Write-Host "  WARN: could not adjust task ACL: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }

  Write-Host "Registered: $Name (runs as SYSTEM, at boot + every ${EveryMinutes}m)" -ForegroundColor Green
}

Register-BootTask -Name $PlatformTaskName -ScriptPath $StartupScript `
  -Description "Starts the Business OS platform (:3100) and the Cloudflare tunnel at boot and every 5 minutes. Idempotent."

Register-BootTask -Name $WatchdogTaskName -ScriptPath $WatchdogScript `
  -Description "Probes the Business OS platform on :3100 and rebuilds/restarts it when down or wedged."

# Show what is really registered before declaring success. This is the check that
# would have caught the earlier run where only the watchdog task existed.
Write-Host ""
Write-Host "Verifying what is actually registered:"
$missing = @()
foreach ($name in @($PlatformTaskName, $WatchdogTaskName)) {
  $t = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if ($t) {
    $hasBoot = ($t.Triggers | Where-Object { $_.CimClass.CimClassName -eq "MSFT_TaskBootTrigger" }).Count -gt 0
    Write-Host ("  [OK]   {0}  user={1}  bootTrigger={2}" -f $name, $t.Principal.UserId, $hasBoot) -ForegroundColor Green
  } else {
    Write-Host "  [MISS] $name" -ForegroundColor Red
    $missing += $name
  }
}
if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host "FAILED: these tasks were not created: $($missing -join ', ')" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Done. Verify with:"
Write-Host "  Get-ScheduledTask -TaskName BusinessOS-* | Get-ScheduledTaskInfo"
Write-Host "  powershell -NoProfile -File `"$StartupScript`" -Check"
Write-Host ""
Write-Host "Test without rebooting:"
Write-Host "  Start-ScheduledTask -TaskName $PlatformTaskName"
