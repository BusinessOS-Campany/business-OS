/**
 * Celia Windows Transfer Agent
 * -----------------------------
 * Picks up PENDING transfer jobs from the Celia web API and copies files from a
 * configured NAS/SMB share (TrueNAS, Windows share, ...) to a removable USB drive
 * using robocopy. Reports real progress back to the API and honours cancellation.
 *
 * It also watches the removable drives and auto-records manual copies made with
 * Windows Explorer (new top-level folders that the agent itself did not create)
 * as COMPLETED transfers via POST /api/agent/transfers/manual, so they appear in
 * the web app. Source is assumed to be the first active NAS share.
 *
 * Requirements
 * ------------
 * - Windows with robocopy.exe and powershell.exe available.
 * - The Celia web app running and reachable (same machine by default).
 *
 * Environment variables (all optional unless noted)
 * -------------------------------------------------
 * API_URL                     Base URL of the Celia app. Default: http://localhost:3000
 * AGENT_ID                    Stable agent id (must be unique on the server).
 *                             Default: lowercased hostname.
 * AGENT_NAME                  Human friendly agent name. Default: hostname.
 * AGENT_STATE_DIR             Directory for the persisted agent key.
 *                             Default: <project>/data  (git-ignored)
 * HEARTBEAT_INTERVAL_MS       Heartbeat interval. Default: 15000
 * JOB_POLL_INTERVAL_MS        Poll interval for new jobs. Default: 5000
 * PROGRESS_INTERVAL_MS        Progress report interval. Default: 2500
 * DEVICE_SCAN_INTERVAL_MS     Removable device scan interval. Default: 30000
 * MANUAL_SCAN_INTERVAL_MS     Manual-copy detection interval. Default: 15000
 *
 * Run
 * ---
 *   npm run transfer:agent
 *
 * Notes
 * -----
 * - Allowed NAS shares and their credentials come from the server (heartbeat).
 *   No share host/path is hardcoded here and no secrets are logged.
 * - The destination drive is validated against the live removable-device scan,
 *   so system drives (C:, D:, ...) can never be used as a transfer target.
 * - robocopy exit codes are interpreted per the documented scheme:
 *   0/1/2/3 = success, 4/7 = success with mismatches, >=8 = failure.
 */
import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const API_URL = (process.env.API_URL || "http://localhost:3000").replace(/\/+$/, "");
const AGENT_NAME = process.env.AGENT_NAME || os.hostname();
const AGENT_ID = (process.env.AGENT_ID || os.hostname().toLowerCase().replace(/[^a-z0-9._-]+/g, "-")).slice(0, 64);
const CONFIG_DIR = process.env.AGENT_STATE_DIR || path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(CONFIG_DIR, "agent-config.json");
const HEARTBEAT_INTERVAL_MS = envNumber("HEARTBEAT_INTERVAL_MS", 15000);
const JOB_POLL_INTERVAL_MS = envNumber("JOB_POLL_INTERVAL_MS", 5000);
const PROGRESS_INTERVAL_MS = envNumber("PROGRESS_INTERVAL_MS", 2500);
const DEVICE_SCAN_INTERVAL_MS = envNumber("DEVICE_SCAN_INTERVAL_MS", 30000);
const MANUAL_SCAN_INTERVAL_MS = envNumber("MANUAL_SCAN_INTERVAL_MS", 15000);
const MAX_BACKOFF_MS = 30000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentConfig {
  agentId: string;
  apiKey: string;
}

interface NasShareFromHeartbeat {
  id: string;
  name: string;
  host: string;
  protocol: string;
  share: string;
  username: string | null;
  password: string | null;
  basePath: string | null;
  isActive: boolean;
}

interface AgentDevice {
  deviceId: string;
  deviceName: string | null;
  deviceLabel: string | null;
  deviceType: string;
  removable: boolean;
  driveLetter: string | null;
  filesystem: string | null;
  totalCapacity: number | null;
  freeSpace: number | null;
  serialNumber: string | null;
}

interface AgentJob {
  id: string;
  jobNo: number;
  status: string;
  sourcePath: string;
  destinationPath: string;
  nasShare: { id: string; name: string; host: string; sharePath: string; basePath: string | null } | null;
}

interface ActiveTransfer {
  job: AgentJob;
  robocopy: ChildProcess | null;
  killedBy: "cancel" | "disconnect" | null;
  transferredSize: number;
  transferredFiles: number;
  totalSize: number;
  totalFiles: number;
  lastBytes: number;
  lastTime: number;
  startedAt: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let auth: AgentConfig;
let shares: NasShareFromHeartbeat[] = [];
let detectedDevices: AgentDevice[] = [];
let activeTransfer: ActiveTransfer | null = null;
let mountedUnc: string | null = null;
let shuttingDown = false;

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

type LogLevel = "INFO" | "WARN" | "ERROR";

function log(level: LogLevel, message: string) {
  const time = new Date().toISOString().slice(11, 19);
  const line = `[${time}] [${level}] ${message}`;
  if (level === "ERROR") console.error(line);
  else console.log(line);
}

function msg(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function api<T>(
  urlPath: string,
  opts: { method?: string; body?: unknown; agent?: boolean } = {},
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.agent !== false) {
    headers["x-agent-id"] = auth.agentId;
    headers["x-agent-key"] = auth.apiKey;
  }
  const response = await fetch(`${API_URL}${urlPath}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const data = (await response.json().catch(() => null)) as T;
  return { status: response.status, data };
}

async function safeApi(urlPath: string, opts: { method?: string; body?: unknown }) {
  try {
    const { status, data } = await api<{ error?: string }>(urlPath, opts);
    if (status >= 400) log("WARN", `POST ${urlPath} -> HTTP ${status} (${data?.error ?? "unknown"})`);
  } catch (error) {
    log("WARN", `POST ${urlPath} failed: ${msg(error)}`);
  }
}

// ---------------------------------------------------------------------------
// Persisted agent registration
// ---------------------------------------------------------------------------

function loadConfig(): AgentConfig | null {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as AgentConfig;
  } catch {
    return null;
  }
}

function saveConfig(config: AgentConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

async function ensureRegistered(): Promise<void> {
  const existing = loadConfig();
  if (existing?.agentId && existing?.apiKey) {
    auth = existing;
    log("INFO", `Agent restored from ${CONFIG_FILE} (${auth.agentId})`);
    return;
  }

  const { status, data } = await api<{ agentId?: string; apiKey?: string; error?: string }>("/api/agent/register", {
    method: "POST",
    body: { agentId: AGENT_ID, name: AGENT_NAME },
    agent: false,
  });

  if (status === 409) {
    log(
      "ERROR",
      `Agent "${AGENT_ID}" already registered on the server but no local key was found. ` +
        `Restore the saved key or re-register with a different AGENT_ID.`,
    );
    process.exit(1);
  }
  if (status >= 400 || !data?.apiKey || !data.agentId) {
    log("ERROR", `Registration failed (HTTP ${status}): ${JSON.stringify(data)}`);
    process.exit(1);
  }

  auth = { agentId: data.agentId, apiKey: data.apiKey };
  saveConfig(auth);
  log("INFO", `Registered agent "${auth.agentId}" (${AGENT_NAME})`);
}

// ---------------------------------------------------------------------------
// PowerShell helpers
// ---------------------------------------------------------------------------

function runPowerShell(script: string, extraEnv: Record<string, string> = {}, timeoutMs = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      { windowsHide: true, env: { ...process.env, ...extraEnv } },
    );
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // already gone
      }
      reject(new Error(`PowerShell timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`PowerShell exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
    });
  });
}

function runNet(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("net.exe", args, { windowsHide: true });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`net ${args[0]} exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Removable device scan
// ---------------------------------------------------------------------------

const DEVICE_SCAN_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$volumes = Get-Volume | Where-Object { $_.DriveLetter -and $_.DriveType -in @('Removable','Fixed') }
$rows = @()
foreach ($vol in $volumes) {
  $part = Get-Partition -DriveLetter $vol.DriveLetter
  $disk = $null
  if ($part) { $disk = Get-Disk -Number $part.DiskNumber }
  $busType = if ($disk) { [string]$disk.BusType } else { '' }
  $mediaType = if ($disk) { [string]$disk.MediaType } else { '' }
  $friendly = if ($disk) { [string]$disk.FriendlyName } else { '' }
  $isUsb = $busType -eq 'USB'
  $isRemovable = ([string]$vol.DriveType -eq 'Removable')
  $deviceType = 'INTERNAL'
  if ($isRemovable) { $deviceType = 'USB_FLASH' }
  elseif ($isUsb) {
    if ($mediaType -eq 'SSD') { $deviceType = 'EXTERNAL_SSD' }
    elseif ($mediaType -eq 'HDD') { $deviceType = 'EXTERNAL_HDD' }
    else { $deviceType = 'USB_FLASH' }
  }
  $serial = if ($disk) { [string]$disk.SerialNumber } else { '' }
  $unique = if ($vol.UniqueId) { [string]$vol.UniqueId } else { '' }
  $key = (($serial + $unique) -replace '[^A-Za-z0-9]', '')
  if (-not $key) { $key = $vol.ObjectId }
  $deviceId = "$($vol.DriveLetter)-$key"
  $label = if ($vol.FileSystemLabel) { [string]$vol.FileSystemLabel } else { '' }
  $fs = if ($vol.FileSystem) { [string]$vol.FileSystem } else { '' }
  $name = if ($label) { $label } elseif ($friendly) { $friendly } else { $null }
  $rows += [PSCustomObject]@{
    deviceId = $deviceId
    deviceName = $name
    deviceLabel = $(if ($label) { $label } else { $null })
    deviceType = $deviceType
    removable = ($isRemovable -or $isUsb)
    driveLetter = "$($vol.DriveLetter):"
    filesystem = $(if ($fs) { $fs } else { $null })
    totalCapacity = $(if ($vol.Size) { $vol.Size } else { $null })
    freeSpace = $(if ($vol.SizeRemaining) { $vol.SizeRemaining } else { $null })
    serialNumber = $(if ($serial) { $serial } else { $null })
  }
}
if ($rows.Count -eq 0) { Write-Output '[]' } else { $rows | ConvertTo-Json -Compress -Depth 3 }
`;

async function scanDevices(): Promise<AgentDevice[]> {
  const raw = await runPowerShell(DEVICE_SCAN_SCRIPT);
  const text = raw.trim();
  if (!text || text === "[]") return [];
  const parsed = JSON.parse(text) as AgentDevice | AgentDevice[];
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function syncDevices(): Promise<void> {
  try {
    const devices = await scanDevices();
    detectedDevices = devices;
    const { status } = await api("/api/agent/devices", { method: "POST", body: { devices } });
    if (status >= 400) {
      log("WARN", `Device sync failed (HTTP ${status})`);
    } else {
      log("INFO", `Device scan: ${devices.length} removable device(s)`);
    }
  } catch (error) {
    log("WARN", `Device scan failed: ${msg(error)}`);
  }
}

// ---------------------------------------------------------------------------
// Heartbeat + share cache
// ---------------------------------------------------------------------------

async function heartbeatOnce(): Promise<boolean> {
  try {
    const { status, data } = await api<{ ok?: boolean; shares?: NasShareFromHeartbeat[] }>(
      "/api/agent/heartbeat",
      { method: "POST", body: { status: "ONLINE" } },
    );
    if (status >= 400) throw new Error(`heartbeat HTTP ${status}`);
    if (Array.isArray(data?.shares)) shares = data.shares;
    return true;
  } catch (error) {
    log("WARN", `Heartbeat failed: ${msg(error)}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// NAS mount (only when the share requires credentials)
// ---------------------------------------------------------------------------

async function mountShareIfNeeded(share: NasShareFromHeartbeat | null): Promise<void> {
  if (!share || !share.username) return;
  const unc = `\\\\${share.host}\\${share.share}`;
  await runNet(["use", unc, share.password ?? "", "/user:" + share.username, "/persistent:no"]);
  mountedUnc = unc;
  log("INFO", `Mounted ${share.host}\\${share.share}`);
}

async function unmountShareIfNeeded(): Promise<void> {
  if (!mountedUnc) return;
  try {
    await runNet(["use", mountedUnc, "/delete", "/y"]);
  } catch {
    // best effort
  }
  mountedUnc = null;
}

// ---------------------------------------------------------------------------
// Source pre-scan (total size + file count for percent reporting)
// ---------------------------------------------------------------------------

const SCAN_SOURCE_SCRIPT = `
$ErrorActionPreference = 'Stop'
$root = $env:AGENT_SRC_ROOT
if (-not (Test-Path -LiteralPath $root)) { Write-Output '__MISSING__'; exit 0 }
$files = @(Get-ChildItem -LiteralPath $root -Recurse -File -Force)
$total = 0
foreach ($f in $files) { $total += $f.Length }
[PSCustomObject]@{ totalSize = $total; fileCount = $files.Count } | ConvertTo-Json -Compress
`;

async function preScanSource(source: string): Promise<{ totalSize: number; fileCount: number }> {
  try {
    const raw = await runPowerShell(SCAN_SOURCE_SCRIPT, { AGENT_SRC_ROOT: source }, 30000);
    const text = raw.trim();
    if (text === "__MISSING__") {
      log("ERROR", `Source not reachable: ${source}`);
      throw new Error(`Source not reachable: ${source}`);
    }
    const parsed = JSON.parse(text) as { totalSize?: number; fileCount?: number };
    return { totalSize: parsed.totalSize ?? 0, fileCount: parsed.fileCount ?? 0 };
  } catch (error) {
    throw new Error(`Source pre-scan failed: ${msg(error)}`);
  }
}

const MEASURE_DEST_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$root = $env:AGENT_DEST_ROOT
if (-not (Test-Path -LiteralPath $root)) { Write-Output '0|0'; exit 0 }
$files = @(Get-ChildItem -LiteralPath $root -Recurse -File -Force)
$total = 0
foreach ($f in $files) { $total += $f.Length }
Write-Output ("{0}|{1}" -f $total, $files.Count)
`;

async function measureDestination(dest: string): Promise<{ size: number; count: number } | null> {
  try {
    const raw = await runPowerShell(MEASURE_DEST_SCRIPT, { AGENT_DEST_ROOT: dest });
    const [size, count] = raw.trim().split("|").map((part) => Number(part));
    if (!Number.isFinite(size) || !Number.isFinite(count)) return null;
    return { size, count };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Manual-copy detection (Windows Explorer copies onto a USB)
// ---------------------------------------------------------------------------

interface DeviceSnapshot {
  files: Record<string, number>;
  folders: string[];
  baselined: boolean;
}

const SNAPSHOT_DIR = path.join(CONFIG_DIR, "device-snapshots");

function snapshotFile(deviceId: string): string {
  const safe = deviceId.replace(/[^A-Za-z0-9._-]/g, "_");
  return path.join(SNAPSHOT_DIR, `${safe}.json`);
}

function loadSnapshot(deviceId: string): DeviceSnapshot | null {
  try {
    const parsed = JSON.parse(readFileSync(snapshotFile(deviceId), "utf8")) as Partial<DeviceSnapshot>;
    return {
      files: parsed.files ?? {},
      folders: parsed.folders ?? [],
      baselined: Boolean(parsed.baselined),
    };
  } catch {
    return null;
  }
}

function saveSnapshot(deviceId: string, snapshot: DeviceSnapshot): void {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  writeFileSync(snapshotFile(deviceId), JSON.stringify(snapshot), "utf8");
}

/**
 * Checks whether a top-level folder/file exists on a NAS share root. Used to
 * attribute a manual copy to the share it actually came from.
 */
const MATCH_SHARE_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$root = $env:AGENT_SHARE_ROOT
$name = $env:AGENT_ITEM_NAME
$m = Get-ChildItem -LiteralPath $root -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -ieq $name }
if ($m) { Write-Output 'MATCH' } else { Write-Output 'NONE' }
`;

/**
 * Enumerates every file in all active NAS shares (name, relative path, size).
 * Used to attribute a manual copy to the share that actually contains the
 * copied files (e.g. files dropped into an existing folder on the USB).
 */
const SHARE_INDEX_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$shares = $env:AGENT_SHARES | ConvertFrom-Json
foreach ($s in $shares) {
  $root = "\\\\$($s.host)\\$($s.share)"
  if ($s.base) { $root += "\\$($s.base)" }
  if (-not (Test-Path -LiteralPath $root)) { continue }
  Get-ChildItem -LiteralPath $root -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $rel = $_.FullName.Substring($root.Length).Replace('\\', '/').TrimStart('/')
      Write-Output ("{0}|{1}|{2}|{3}" -f $s.host, $s.share, $rel, $_.Length)
    } catch {}
  }
}
`;

/**
 * Enumerates all files under `dir` (relative to `root`). Returns a Map of
 * normalized relative paths ("Folder/file.txt") to sizes in bytes.
 */
const SCAN_FILES_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$root = $env:AGENT_SCAN_ROOT
$dir = $env:AGENT_SCAN_DIR
if (-not (Test-Path -LiteralPath $dir)) { exit 0 }
Get-ChildItem -LiteralPath $dir -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
  try {
    $rel = $_.FullName.Substring($root.Length).Replace('\\', '/')
    Write-Output ("{0}|{1}" -f $rel, $_.Length)
  } catch {}
}
`;

async function scanDirFiles(root: string, dir: string): Promise<Map<string, number>> {
  const raw = await runPowerShell(SCAN_FILES_SCRIPT, { AGENT_SCAN_ROOT: root, AGENT_SCAN_DIR: dir }, 120000);
  const files = new Map<string, number>();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const pipe = trimmed.lastIndexOf("|");
    if (pipe <= 0) continue;
    const rel = trimmed.slice(0, pipe);
    const size = Number(trimmed.slice(pipe + 1));
    if (rel && Number.isFinite(size) && size >= 0) files.set(rel, size);
  }
  return files;
}

function topFolder(relPath: string): string {
  const idx = relPath.indexOf("/");
  return idx === -1 ? "" : relPath.slice(0, idx);
}

function deriveFolders(files: Map<string, number>): string[] {
  const folders = new Set<string>();
  for (const rel of files.keys()) {
    const folder = topFolder(rel);
    if (folder) folders.add(folder.toLowerCase());
  }
  return [...folders];
}

/**
 * Finds which configured NAS share actually contains a copied top-level item,
 * so the recorded source is accurate instead of assuming the first share.
 */
async function matchSourceShare(folder: string): Promise<NasShareFromHeartbeat | null> {
  if (!folder) return null;
  const candidates =
    shares.filter((item) => item.isActive).length > 0
      ? shares.filter((item) => item.isActive)
      : shares;
  for (const share of candidates) {
    const base = `\\\\${share.host}\\${share.share}`;
    const root = share.basePath ? `${base}\\${share.basePath}` : base;
    try {
      const raw = await runPowerShell(
        MATCH_SHARE_SCRIPT,
        { AGENT_SHARE_ROOT: root, AGENT_ITEM_NAME: folder },
        20000,
      );
      if (raw.trim().toUpperCase().includes("MATCH")) return share;
    } catch {
      // unreachable share, try the next one
    }
  }
  return null;
}

async function recordManualTransfer(
  device: AgentDevice,
  folder: string,
  files: { rel: string; size: number }[],
): Promise<boolean> {
  const size = files.reduce((sum, item) => sum + item.size, 0);
  const count = files.length;
  const resolved = await resolveSource(folder, files);
  const share = resolved.share;
  const sourcePath = resolved.sourcePath;
  const destinationPath = folder ? `${device.driveLetter}\\${folder}` : `${device.driveLetter}\\`;

  if (!share) {
    log(
      "INFO",
      `Skipped manual copy ${destinationPath} (${count} file(s)): source not found on a selected server share.`,
    );
    return true;
  }

  try {
    const { status, data } = await api<{ job?: { id: string }; duplicate?: boolean; error?: string }>(
      "/api/agent/transfers/manual",
      {
        method: "POST",
        body: {
          deviceId: device.deviceId,
          nasShareId: share?.id ?? null,
          sourcePath,
          destinationPath,
          transferredSize: size,
          filesCount: count,
          accumulate: true,
        },
      },
    );
    if (status >= 400) {
      log("WARN", `Recording manual copy failed (HTTP ${status}): ${data?.error ?? ""}`);
      return false;
    }
    log("INFO", `Manual copy recorded: ${destinationPath} (${count} file(s), ${formatBytes(size)}) <- ${sourcePath}`);
    return true;
  } catch (error) {
    log("WARN", `Recording manual copy failed: ${msg(error)}`);
    return false;
  }
}

interface ShareIndexEntry {
  host: string;
  share: string;
  path: string;
  name: string;
  size: number;
}

let shareIndexCache: { builtAt: number; entries: ShareIndexEntry[] } | null = null;

const SHARE_INDEX_TTL_MS = 60_000;

async function getShareIndex(): Promise<ShareIndexEntry[]> {
  if (shareIndexCache && Date.now() - shareIndexCache.builtAt < SHARE_INDEX_TTL_MS) {
    return shareIndexCache.entries;
  }
  const candidates = shares.filter((item) => item.isActive).length > 0 ? shares.filter((item) => item.isActive) : shares;
  if (candidates.length === 0) return [];
  const env = {
    AGENT_SHARES: JSON.stringify(
      candidates.map((item) => ({ host: item.host, share: item.share, base: item.basePath ?? "" })),
    ),
  };
  try {
    const raw = await runPowerShell(SHARE_INDEX_SCRIPT, env, 90_000);
    const entries: ShareIndexEntry[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const parts = line.split("|");
      if (parts.length < 4) continue;
      const [, share, path, sizeRaw] = parts;
      const size = Number(sizeRaw);
      if (!share || !path || !Number.isFinite(size)) continue;
      const host = parts[0];
      entries.push({ host, share, path, name: path.split("/").pop()?.toLowerCase() ?? "", size });
    }
    shareIndexCache = { builtAt: Date.now(), entries };
    return entries;
  } catch (error) {
    log("WARN", `Share index scan failed: ${msg(error)}`);
    return shareIndexCache?.entries ?? [];
  }
}

function commonParentPath(paths: string[]): string {
  if (paths.length === 0) return "";
  const parts = paths.map((path) => path.split("/"));
  const common: string[] = [];
  const first = parts[0];
  for (let i = 0; i < first.length; i++) {
    const segment = first[i];
    if (parts.every((item) => item[i] === segment)) {
      common.push(segment);
    } else {
      break;
    }
  }
  return common.join("/");
}

/**
 * Resolves the best-guess source (share + UNC path) for a manual copy:
 * 1. The top-level folder exists on a share root (whole-folder copy).
 * 2. The copied files (by name + size) exist in a share (files dropped into
 *    existing folders, root-level files).
 * Returns share=null when the copy did not originate from a selected server
 * share (e.g. copied from the local PC), so it is not recorded as a transfer.
 */
async function resolveSource(
  folder: string,
  files: { rel: string; size: number }[],
): Promise<{ share: NasShareFromHeartbeat | null; sourcePath: string }> {
  if (folder) {
    const matched = await matchSourceShare(folder);
    if (matched) {
      const base = `\\\\${matched.host}\\${matched.share}`;
      return { share: matched, sourcePath: `${base}\\${folder}` };
    }
  }

  if (files.length > 0) {
    const index = await getShareIndex();
    const hits = files
      .map((file) => {
        const name = file.rel.split("/").pop()?.toLowerCase() ?? "";
        return index.find((entry) => entry.name === name && entry.size === file.size);
      })
      .filter((entry): entry is ShareIndexEntry => Boolean(entry));

    if (hits.length > 0) {
      const counts = new Map<string, number>();
      for (const hit of hits) {
        const key = `${hit.host}\\${hit.share.toLowerCase()}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const topKey = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      const topHits = hits.filter((hit) => `${hit.host}\\${hit.share.toLowerCase()}` === topKey);
      const share = shares.find(
        (item) => item.host === topHits[0].host && item.share.toLowerCase() === topHits[0].share.toLowerCase(),
      );
      const base = `\\\\${topHits[0].host}\\${topHits[0].share}`;
      let sourcePath: string;
      if (topHits.length === 1) {
        sourcePath = `${base}\\${topHits[0].path}`;
      } else {
        const parent = commonParentPath(topHits.map((hit) => hit.path));
        sourcePath = parent ? `${base}\\${parent}` : `${base}\\`;
      }
      return { share: share ?? null, sourcePath };
    }
  }

  return { share: null, sourcePath: folder ? `Manual copy / ${folder}` : "Manual copy" };
}


async function detectManualCopies(): Promise<void> {
  for (const device of detectedDevices) {
    if (!device.driveLetter || !device.removable) continue;
    const root = `${device.driveLetter.replace(/\\+$/, "")}\\`;
    const deviceId = device.deviceId;

    const snapshot = loadSnapshot(deviceId);
    if (!snapshot || !snapshot.baselined) {
      try {
        const files = await scanDirFiles(root, root);
        saveSnapshot(deviceId, { files: lowerKeyMap(files), folders: deriveFolders(files), baselined: true });
        log("INFO", `Manual-copy baseline recorded for ${device.driveLetter}`);
      } catch (error) {
        log("WARN", `Baseline scan failed for ${device.driveLetter}: ${msg(error)}`);
      }
      continue;
    }

    let current: Map<string, number>;
    try {
      current = await scanDirFiles(root, root);
    } catch (error) {
      log("WARN", `Drive scan failed for ${device.driveLetter}: ${msg(error)}`);
      continue;
    }

    const knownFiles = new Set(Object.keys(snapshot.files));

    const pending: { folder: string; files: { rel: string; size: number }[] }[] = [];
    for (const [rel, size] of current) {
      if (knownFiles.has(rel.toLowerCase())) continue;
      const folder = topFolder(rel);
      const entry = pending.find((item) => item.folder === folder);
      if (entry) {
        entry.files.push({ rel, size });
      } else {
        pending.push({ folder, files: [{ rel, size }] });
      }
    }

    for (const entry of pending) {
      const recorded = await recordManualTransfer(device, entry.folder, entry.files);
      if (recorded) {
        for (const [rel, size] of current) {
          if (topFolder(rel) === entry.folder) {
            snapshot.files[rel.toLowerCase()] = size;
          }
        }
        if (entry.folder) snapshot.folders.push(entry.folder.toLowerCase());
      }
    }

    for (const folder of deriveFolders(current)) {
      if (!snapshot.folders.includes(folder)) snapshot.folders.push(folder);
    }
    saveSnapshot(deviceId, snapshot);
  }
}

function lowerKeyMap(files: Map<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [rel, size] of files) out[rel.toLowerCase()] = size;
  return out;
}

/**
 * Marks an agent-run job's destination folder as known so the agent's own
 * robocopy output is never mistaken for a manual Windows-Explorer copy.
 */
async function markDestKnown(driveLetter: string, dest: string): Promise<void> {
  const device = detectedDevices.find(
    (item) => item.driveLetter?.toUpperCase() === `${driveLetter}:`,
  );
  if (!device) return;
  const root = `${driveLetter}:\\`;

  const snapshot = loadSnapshot(device.deviceId) ?? { files: {}, folders: [], baselined: false };
  if (dest.toLowerCase() !== root.toLowerCase()) {
    const folder = dest.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "";
    if (folder) snapshot.folders.push(folder.toLowerCase());
  }
  try {
    const files = await scanDirFiles(root, dest);
    for (const [rel, size] of files) snapshot.files[rel.toLowerCase()] = size;
  } catch {
    // best effort
  }
  saveSnapshot(device.deviceId, snapshot);
}

// ---------------------------------------------------------------------------
// robocopy engine
// ---------------------------------------------------------------------------

function spawnRobocopy(source: string, dest: string): ChildProcess {
  const sourceArg = source.replace(/[\\/]+$/, "");
  const destArg = dest.replace(/[\\/]+$/, "");
  return spawn("robocopy.exe", [
    sourceArg,
    destArg,
    "/E",
    "/COPY:DAT",
    "/DCOPY:DAT",
    "/R:1",
    "/W:1",
    "/XJ",
    "/FP",
    "/NC",
    "/NDL",
    "/NJH",
    "/NJS",
    "/NP",
    "/BYTES",
  ], { windowsHide: true });
}

/**
 * robocopy file lines look like `<tab>...<size><tab><full source path>`.
 * Only lines whose path is under the source root are counted, so destination-only
 * "Extra" lines and unrelated output are ignored.
 */
function parseRobocopyFileLine(line: string, sourceRootLower: string): { size: number } | null {
  const segments = line
    .split(/\t+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (segments.length < 2) return null;
  const filePath = segments[segments.length - 1];
  if (!filePath.toLowerCase().startsWith(sourceRootLower)) return null;
  const size = Number(segments[segments.length - 2]);
  if (!Number.isFinite(size) || size < 0) return null;
  return { size };
}

function attachRobocopyOutput(child: ChildProcess, transfer: ActiveTransfer, source: string): void {
  const sourceRootLower = source.toLowerCase();
  let buffer = "";

  const onData = (chunk: string): void => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      const parsed = parseRobocopyFileLine(line, sourceRootLower);
      if (parsed) {
        transfer.transferredSize += parsed.size;
        transfer.transferredFiles += 1;
      }
      newline = buffer.indexOf("\n");
    }
  };

  child.stdout?.on("data", (chunk: Buffer) => onData(chunk.toString("utf8")));
  child.stderr?.on("data", (chunk: Buffer) => onData(chunk.toString("utf8")));
}

function waitExit(child: ChildProcess): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve) => {
    child.once("error", () => resolve({ code: null, signal: "SIGTERM" }));
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

function killRobocopy(transfer: ActiveTransfer, reason: "cancel" | "disconnect"): void {
  if (transfer.killedBy) return;
  transfer.killedBy = reason;
  if (transfer.robocopy && transfer.robocopy.exitCode === null) {
    try {
      transfer.robocopy.kill();
    } catch {
      // already gone
    }
  }
}

function driveExists(driveLetter: string): boolean {
  try {
    return existsSync(`${driveLetter}:\\`);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Job validation
// ---------------------------------------------------------------------------

interface JobValidation {
  ok: boolean;
  error?: string;
  source?: string;
  dest?: string;
  driveLetter?: string;
}

function validateJob(job: AgentJob): JobValidation {
  const share = job.nasShare;
  if (!share || !share.host || !share.sharePath) {
    return { ok: false, error: "Job references no configured NAS share." };
  }

  const root = `//${share.host}/${share.sharePath}`.toLowerCase();
  const normSource = job.sourcePath.replace(/\\/g, "/").toLowerCase();
  if (!normSource.startsWith(root)) {
    return { ok: false, error: `Source "${job.sourcePath}" is not under the configured share ${root}.` };
  }
  const remainder = normSource.slice(root.length);
  if (remainder.split("/").some((part) => part === ".." || part === ".")) {
    return { ok: false, error: "Source path contains traversal segments." };
  }

  const match = job.destinationPath.trim().match(/^([a-zA-Z]):[\\/](.*)$/);
  if (!match) {
    return { ok: false, error: `Invalid destination path: ${job.destinationPath}` };
  }
  const driveLetter = match[1].toUpperCase();
  const destDevice = detectedDevices.find(
    (device) => device.driveLetter?.toUpperCase() === `${driveLetter}:`,
  );
  if (!destDevice || !destDevice.removable) {
    return { ok: false, error: `Drive ${driveLetter}: is not a detected removable device.` };
  }

  const tail = match[2];
  let dest: string;
  if (tail.length === 0) {
    dest = `${driveLetter}:\\`;
  } else {
    const cleaned = tail.replace(/[\\/]+/g, "/").replace(/\/+$/, "");
    if (
      !cleaned ||
      cleaned.split("/").some((part) => part === ".." || part === ".") ||
      /[:*?"<>|]/.test(cleaned)
    ) {
      return { ok: false, error: `Unsafe destination path: ${job.destinationPath}` };
    }
    dest = `${driveLetter}:\\${cleaned.replace(/\//g, "\\")}`;
  }

  return { ok: true, source: job.sourcePath, dest, driveLetter };
}

// ---------------------------------------------------------------------------
// Job execution
// ---------------------------------------------------------------------------

async function failJob(job: AgentJob, transfer: ActiveTransfer, message: string): Promise<void> {
  await safeApi(`/api/agent/jobs/${job.id}/fail`, {
    method: "POST",
    body: {
      errorMessage: message.slice(0, 1000),
      transferredSize: transfer.transferredSize,
      filesCount: transfer.transferredFiles,
    },
  });
  log("ERROR", `Job #${job.jobNo} failed: ${message}`);
}

async function cancelJob(job: AgentJob, transfer: ActiveTransfer): Promise<void> {
  await safeApi(`/api/agent/jobs/${job.id}/cancel`, {
    method: "POST",
    body: {
      transferredSize: transfer.transferredSize,
      filesCount: transfer.transferredFiles,
    },
  });
  log("WARN", `Job #${job.jobNo} cancelled after ${transfer.transferredFiles} file(s)`);
}

async function reportProgressTick(
  job: AgentJob,
  transfer: ActiveTransfer,
  driveLetter: string,
): Promise<void> {
  if (transfer.killedBy) return;

  if (!driveExists(driveLetter)) {
    log("ERROR", `Destination device ${driveLetter}: disconnected during transfer.`);
    killRobocopy(transfer, "disconnect");
    return;
  }

  const now = Date.now();
  const elapsed = (now - transfer.lastTime) / 1000;
  const speed =
    elapsed > 0 && transfer.transferredSize >= transfer.lastBytes
      ? Math.round((transfer.transferredSize - transfer.lastBytes) / elapsed)
      : 0;
  transfer.lastBytes = transfer.transferredSize;
  transfer.lastTime = now;

  try {
    const { data } = await api<{ status?: string; cancelRequested?: boolean }>(
      `/api/agent/jobs/${job.id}/progress`,
      {
        method: "POST",
        body: {
          transferredSize: transfer.transferredSize,
          filesCount: transfer.transferredFiles,
          currentSpeed: speed,
        },
      },
    );
    if (data?.cancelRequested) {
      log("WARN", `Cancel requested for job #${job.jobNo}; stopping.`);
      killRobocopy(transfer, "cancel");
      return;
    }
    if (data?.status && data.status !== "RUNNING") {
      log("WARN", `Job #${job.jobNo} is ${data.status} on the server; stopping.`);
      killRobocopy(transfer, "cancel");
      return;
    }
  } catch (error) {
    log("WARN", `Progress report failed: ${msg(error)}`);
  }

  const percent =
    transfer.totalSize > 0 ? Math.round((transfer.transferredSize / transfer.totalSize) * 100) : null;
  if (percent !== null) {
    log(
      "INFO",
      `Progress: ${percent}% (${formatBytes(transfer.transferredSize)} / ${formatBytes(transfer.totalSize)})`,
    );
  }
}

async function runJob(job: AgentJob): Promise<void> {
  if (activeTransfer || shuttingDown) return;
  log("INFO", `Job received: #${job.jobNo} (${job.sourcePath} -> ${job.destinationPath})`);

  const validation = validateJob(job);
  if (!validation.ok) {
    log("ERROR", `Job #${job.jobNo} rejected: ${validation.error}`);
    await safeApi(`/api/agent/jobs/${job.id}/fail`, {
      method: "POST",
      body: { errorMessage: validation.error },
    });
    return;
  }

  const source = validation.source as string;
  const dest = validation.dest as string;
  const driveLetter = validation.driveLetter as string;

  const transfer: ActiveTransfer = {
    job,
    robocopy: null,
    killedBy: null,
    transferredSize: 0,
    transferredFiles: 0,
    totalSize: 0,
    totalFiles: 0,
    lastBytes: 0,
    lastTime: Date.now(),
    startedAt: Date.now(),
  };
  activeTransfer = transfer;

  try {
    const scan = await preScanSource(source);
    transfer.totalSize = scan.totalSize;
    transfer.totalFiles = scan.fileCount;
    log("INFO", `Source scan: ${scan.fileCount} file(s), ${formatBytes(scan.totalSize)}`);

    if (!driveExists(driveLetter)) {
      await failJob(job, transfer, "Destination device disconnected before transfer started.");
      return;
    }

    await markDestKnown(driveLetter, dest).catch(() => undefined);

    const share = shares.find((item) => item.id === job.nasShare?.id) ?? null;
    await mountShareIfNeeded(share);

    const start = await api<{ error?: string }>(`/api/agent/jobs/${job.id}/start`, {
      method: "POST",
      body: { jobNo: job.jobNo },
    });
    if (start.status === 409) {
      log("ERROR", `Job #${job.jobNo} is no longer startable on the server.`);
      return;
    }
    if (start.status >= 400) throw new Error(`start HTTP ${start.status} (${start.data?.error ?? ""})`);
    log("INFO", `Transfer started: #${job.jobNo} -> ${driveLetter}:`);

    const robocopy = spawnRobocopy(source, dest);
    transfer.robocopy = robocopy;
    attachRobocopyOutput(robocopy, transfer, source);

    const tickTimer = setInterval(() => {
      void reportProgressTick(job, transfer, driveLetter);
    }, PROGRESS_INTERVAL_MS);

    const { code, signal } = await waitExit(robocopy);
    clearInterval(tickTimer);

    if (transfer.killedBy === "disconnect") {
      await failJob(job, transfer, "Destination device disconnected during transfer.");
      return;
    }
    if (transfer.killedBy === "cancel") {
      await cancelJob(job, transfer);
      return;
    }
    if (signal) {
      await failJob(job, transfer, `Robocopy terminated (${signal}) before completion.`);
      return;
    }
    if (code !== null && code & 0x10) {
      await failJob(job, transfer, `Robocopy fatal error (exit code ${code}).`);
      return;
    }
    if (code !== null && code & 0x08) {
      await failJob(job, transfer, `Robocopy could not copy some files (exit code ${code}).`);
      return;
    }
    if (code !== null && code & 0x04) {
      log("WARN", `Robocopy reported file mismatches (exit code ${code}) but completed.`);
    }

    let transferredSize = transfer.totalSize;
    let filesCount = transfer.totalFiles;
    const measured = await measureDestination(dest);
    if (measured) {
      transferredSize = measured.size;
      filesCount = measured.count;
    }

    const complete = await api<{ error?: string }>(`/api/agent/jobs/${job.id}/complete`, {
      method: "POST",
      body: { transferredSize, filesCount },
    });
    if (complete.status >= 400) throw new Error(`complete HTTP ${complete.status} (${complete.data?.error ?? ""})`);

    const duration = Math.round((Date.now() - transfer.startedAt) / 1000);
    log("INFO", `Job #${job.jobNo} completed: ${filesCount} file(s), ${formatBytes(transferredSize)} in ${duration}s`);
  } catch (error) {
    log("ERROR", `Job #${job.jobNo} failed: ${msg(error)}`);
    await failJob(job, transfer, `Agent error: ${msg(error)}`);
  } finally {
    if (transfer.robocopy && transfer.robocopy.exitCode === null && !transfer.robocopy.killed) {
      try {
        transfer.robocopy.kill();
      } catch {
        // already gone
      }
    }
    await unmountShareIfNeeded();
    activeTransfer = null;
    await markDestKnown(driveLetter, dest).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Loops
// ---------------------------------------------------------------------------

async function fetchNextJob(): Promise<AgentJob | null> {
  const { status, data } = await api<{ job: AgentJob | null }>("/api/agent/jobs");
  if (status >= 400) throw new Error(`jobs HTTP ${status}`);
  return data?.job ?? null;
}

let heartbeatDelay = HEARTBEAT_INTERVAL_MS;
async function scheduleHeartbeat(): Promise<void> {
  if (shuttingDown) return;
  const ok = await heartbeatOnce();
  heartbeatDelay = ok ? HEARTBEAT_INTERVAL_MS : Math.min(heartbeatDelay * 2, MAX_BACKOFF_MS);
  setTimeout(() => void scheduleHeartbeat(), heartbeatDelay);
}

let deviceDelay = DEVICE_SCAN_INTERVAL_MS;
async function scheduleDevices(): Promise<void> {
  if (shuttingDown) return;
  const started = Date.now();
  await syncDevices();
  deviceDelay = DEVICE_SCAN_INTERVAL_MS;
  setTimeout(() => void scheduleDevices(), Math.max(deviceDelay - (Date.now() - started), 1000));
}

let manualDelay = MANUAL_SCAN_INTERVAL_MS;
async function scheduleManualScan(): Promise<void> {
  if (shuttingDown) return;
  const started = Date.now();
  await detectManualCopies();
  manualDelay = MANUAL_SCAN_INTERVAL_MS;
  setTimeout(() => void scheduleManualScan(), Math.max(manualDelay - (Date.now() - started), 1000));
}

let pollDelay = JOB_POLL_INTERVAL_MS;
async function schedulePoll(): Promise<void> {
  if (shuttingDown) return;
  try {
    const job = await fetchNextJob();
    if (job) {
      pollDelay = JOB_POLL_INTERVAL_MS;
      await runJob(job);
    } else {
      pollDelay = JOB_POLL_INTERVAL_MS;
    }
  } catch (error) {
    log("WARN", `Job poll failed: ${msg(error)}`);
    pollDelay = Math.min(pollDelay * 2, MAX_BACKOFF_MS);
  }
  setTimeout(() => void schedulePoll(), pollDelay);
}

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------

function shutdown(signal: string): void {
  if (shuttingDown) process.exit(0);
  shuttingDown = true;
  log("WARN", `Received ${signal}; shutting down`);
  if (activeTransfer?.robocopy && activeTransfer.robocopy.exitCode === null) {
    killRobocopy(activeTransfer, "cancel");
  }
  setTimeout(() => process.exit(0), 3000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log("INFO", `Agent starting (name="${AGENT_NAME}", api=${API_URL})`);
  await ensureRegistered();
  log("INFO", `Agent started: ${AGENT_ID}`);

  await heartbeatOnce();
  await syncDevices();

  void scheduleHeartbeat();
  void scheduleDevices();
  void scheduleManualScan();
  void schedulePoll();
}

main().catch((error) => {
  log("ERROR", `Agent failed to start: ${msg(error)}`);
  process.exit(1);
});
