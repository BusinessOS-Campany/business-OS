# BUSINESSOS STARTUP - brings the whole stack back after a reboot or logon.
#
# Why this exists alongside platform-watchdog.ps1: the watchdog only ever manages
# the PLATFORM (it probes :3100 and rebuilds/restarts it). Nothing managed the
# Cloudflare tunnel, so after a reboot the origin was up but the public hostname
# answered 530 - which is exactly the outage this file was written to stop.
#
# Idempotent by design: run it as often as you like. It starts only what is not
# already running, so it never double-starts a server or a tunnel, and it is safe
# to attach to a logon trigger.
#
#   -Check    report what is/is not running; change nothing (exit 0 if all good)
#   -NoWait   do not block until the platform answers its health probe
#
# Runs as the current user, no elevation. Everything it touches lives under the
# project folder or the user's own profile.

[CmdletBinding()]
param(
  [string]$WorkingDirectory = "",
  [string]$TunnelBinary = "$env:USERPROFILE\cloudflared\cloudflared.exe",
  [string]$TunnelConfig = "$env:USERPROFILE\.cloudflared\config.yml",
  [int]$Port = 3100,
  [string]$ProbePath = "/signin",
  [int]$TimeoutSec = 15,
  [switch]$Check,
  [switch]$NoWait
)

$ErrorActionPreference = "Stop"

if (-not $WorkingDirectory) { $WorkingDirectory = Split-Path -Parent $PSScriptRoot }
if (-not (Test-Path -LiteralPath $WorkingDirectory)) {
  throw "Working directory not found: $WorkingDirectory"
}

$DataDir = Join-Path $WorkingDirectory ".data"
$LogFile = Join-Path $DataDir "startup.log"
$ServeOut = Join-Path $DataDir "prod.out.log"
$ServeErr = Join-Path $DataDir "prod.err.log"
$TunnelOut = Join-Path $DataDir "cloudflared.out.log"
$TunnelErr = Join-Path $DataDir "cloudflared.err.log"

if (-not (Test-Path -LiteralPath $DataDir)) { New-Item -ItemType Directory -Force -Path $DataDir | Out-Null }

function Write-Log {
  param([string]$Level, [string]$Message)
  $stamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
  $line = "$stamp [$Level] $Message`r`n"
  if ((Test-Path -LiteralPath $LogFile) -and (Get-Item -LiteralPath $LogFile).Length -gt 5MB) {
    Move-Item -LiteralPath $LogFile -Destination "$LogFile.1" -Force
  }
  [System.IO.File]::AppendAllText($LogFile, $line, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "[$Level] $Message"
}

# --- platform -------------------------------------------------------------

function Test-Platform {
  $url = "http://127.0.0.1:$Port$ProbePath"
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    return [pscustomobject]@{ Ok = $true; Detail = "HTTP $($resp.StatusCode)" }
  } catch {
    if ($null -ne $_.Exception.Response) {
      # An HTTP error still proves the process is serving.
      return [pscustomobject]@{ Ok = $true; Detail = "HTTP $([int]$_.Exception.Response.StatusCode)" }
    }
    return [pscustomobject]@{ Ok = $false; Detail = $_.Exception.Message }
  }
}

function Test-PortListening {
  param([int]$P)
  return $null -ne (Get-NetTCPConnection -LocalPort $P -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1)
}

function Resolve-NodeBinary {
  # SYSTEM has a different PATH than the logged-on user. Prefer a node that the
  # machine already knows about, then the one bundled next to the running shell.
  $candidates = @()
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $candidates += $cmd.Source }
  $candidates += "C:\Program Files\nodejs\node.exe"
  foreach ($c in $candidates) { if ($c -and (Test-Path -LiteralPath $c)) { return $c } }
  return $null
}

function Start-Platform {
  # Launch Next directly instead of `npm run serve`. Under SYSTEM, npm is often
  # absent from PATH and the npm wrapper would fail silently, which is the whole
  # reason a boot task needs its own start path rather than reusing the user's.
  $nextBin = Join-Path $WorkingDirectory "node_modules\next\dist\bin\next"
  $nodeBin = Resolve-NodeBinary

  if ($nodeBin -and (Test-Path -LiteralPath $nextBin)) {
    Start-Process -FilePath $nodeBin -ArgumentList @($nextBin, "start", "-p", "$Port") `
      -WorkingDirectory $WorkingDirectory -WindowStyle Hidden `
      -RedirectStandardOutput $ServeOut -RedirectStandardError $ServeErr | Out-Null
    return
  }

  # Fallback: the npm wrapper, for the interactive case where it is on PATH.
  Write-Log "WARN" "next binary or node not found; falling back to 'npm run serve'"
  $arg = "/c npm run serve >> `"$ServeOut`" 2>> `"$ServeErr`""
  Start-Process -FilePath "cmd.exe" -ArgumentList $arg -WorkingDirectory $WorkingDirectory -WindowStyle Hidden | Out-Null
}

function Wait-Platform {
  param([int]$Seconds = 120)
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    $p = Test-Platform
    if ($p.Ok) { return $p }
    Start-Sleep -Seconds 3
  }
  return $null
}

# --- tunnel ---------------------------------------------------------------

function Test-Tunnel {
  # A tunnel is "up" if its process is alive. We deliberately do not require the
  # public hostname to answer: that would couple a local startup script to the
  # internet, and a Cloudflare-side blip must not make this restart a good tunnel.
  return $null -ne (Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Start-Tunnel {
  $exe = $TunnelBinary
  if (-not (Test-Path -LiteralPath $exe)) {
    # Fall back to whatever is on PATH, if anything.
    $onPath = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($onPath) { $exe = $onPath.Source } else {
      Write-Log "ERROR" "cloudflared not found at $TunnelBinary and not on PATH; tunnel not started"
      return $false
    }
  }
  # Launched directly rather than through `cmd.exe /c ... >> log`: cloudflared
  # writes its whole log to stderr, and wrapping it in a shell with a redirect
  # made the process exit immediately (observed). A direct Start-Process with the
  # argument array is what was verified to stay up, so logs go to files via the
  # redirect parameters instead of a shell.
  $argList = @()
  if (Test-Path -LiteralPath $TunnelConfig) { $argList += @("tunnel", "--config", $TunnelConfig, "run") }
  else { $argList += @("tunnel", "run") }

  $wd = Join-Path $env:USERPROFILE "cloudflared"
  if (-not (Test-Path -LiteralPath $wd)) { $wd = $env:USERPROFILE }

  Start-Process -FilePath $exe -ArgumentList $argList -WorkingDirectory $wd -WindowStyle Hidden `
    -RedirectStandardOutput $TunnelOut -RedirectStandardError $TunnelErr | Out-Null
  return $true
}

# --- run ------------------------------------------------------------------

Write-Log "INFO" "startup: begin (dir=$WorkingDirectory port=$Port)"

$platformProbe = Test-Platform
$platformListening = Test-PortListening -P $Port
$tunnelUp = Test-Tunnel

if ($Check) {
  Write-Host "platform : $(if ($platformProbe.Ok) { "up ($($platformProbe.Detail))" } elseif ($platformListening) { "port $Port bound but not answering ($($platformProbe.Detail))" } else { "down ($($platformProbe.Detail))" })"
  Write-Host "tunnel   : $(if ($tunnelUp) { "up" } else { "down" })"
  if ($platformProbe.Ok -and $tunnelUp) { exit 0 } else { exit 1 }
}

# 1) Platform. Port bound but silent is the watchdog's wedge case; leave that to
#    the watchdog so the two never fight over the same process.
if ($platformProbe.Ok) {
  Write-Log "INFO" "platform already healthy ($($platformProbe.Detail)), not starting"
} elseif ($platformListening) {
  Write-Log "WARN" "port $Port is bound but not answering; leaving it to the watchdog"
} else {
  Write-Log "INFO" "platform is down, starting (next start -p $Port)"
  Start-Platform
  if (-not $NoWait) {
    $recovered = Wait-Platform -Seconds 120
    if ($recovered) { Write-Log "INFO" "platform came up ($($recovered.Detail))" }
    else { Write-Log "WARN" "platform did not answer within 120s; the watchdog will keep trying" }
  }
}

# 2) Tunnel.
if ($tunnelUp) {
  Write-Log "INFO" "cloudflared already running, not starting"
} else {
  Write-Log "INFO" "cloudflared is not running, starting tunnel"
  if (Start-Tunnel) {
    Start-Sleep -Seconds 5
    if (Test-Tunnel) { Write-Log "INFO" "cloudflared started" }
    else { Write-Log "WARN" "cloudflared did not stay running; check $TunnelErr" }
  }
}

Write-Log "INFO" "startup: done"
exit 0
