import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "@/lib/logger";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export interface NasDirectoryEntry {
  name: string;
  isDirectory: boolean;
  size: number | null;
  modifiedAt: string | null;
}

/**
 * Enumerates the SMB disk shares a host exposes via `net view \\host`.
 * Uses `exec` with shell:true to ensure `net.exe` is found even when
 * System32 is not in the Node process PATH (common on some Windows setups).
 */
export async function listServerShares(host: string): Promise<string[]> {
  let stdout = "";
  try {
    const result = await execAsync(
      `net view "\\\\${host}"`,
      { timeout: 20000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
    );
    stdout = result.stdout;
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    stdout = err.stdout ?? "";
    const stderr = (err.stderr ?? "").trim();
    if (!stdout.trim()) {
      const detail = stderr || err.message || String(error);
      logger.error("net view failed", { host, detail });
      throw new Error(`NETVIEW_FAILED: ${detail}`);
    }
  }

  const shares: string[] = [];
  for (const line of (stdout || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (
      trimmed.startsWith("Share name") ||
      /^-+$/.test(trimmed) ||
      trimmed.startsWith("Shared resources") ||
      trimmed.startsWith("The command") ||
      trimmed.startsWith("Server")
    ) {
      continue;
    }
    const parts = trimmed.split(/\s{2,}/);
    const name = (parts[0] || "").trim();
    const type = (parts[1] || "").trim();
    if (name && type.toLowerCase().startsWith("disk")) {
      shares.push(name);
    }
  }
  return [...new Set(shares)];
}

/**
 * Lists a directory on an SMB share by mounting it with the supplied
 * credentials and running a read-only `Get-ChildItem`. Only used on the
 * Windows machine that hosts this app (the same LAN as the NAS).
 */
export async function listNasDirectory(
  host: string,
  share: string,
  subPath: string,
  username: string | null,
  password: string | null,
): Promise<NasDirectoryEntry[]> {
  const mountPoint = "CeliaNasBrowse";
  const fullPath = `\\\\${host}\\${share}${subPath ? `\\${subPath}` : ""}`;
  const script = `
$ErrorActionPreference = "Stop"
try {
  $cred = $null
  if ("${escapePs(username ?? "")}" -ne "") {
    $pass = ConvertTo-SecureString -AsPlainText "${escapePs(password ?? "")}" -Force
    $cred = New-Object System.Management.Automation.PSCredential("${escapePs(username ?? "")}", $pass)
  }
  New-PSDrive -Name "${mountPoint}" -PSProvider FileSystem -Root "${escapePs(fullPath)}" -Credential $cred -ErrorAction Stop | Out-Null
  try {
    Get-ChildItem -LiteralPath "${mountPoint}:\\" -Force | ForEach-Object {
      [PSCustomObject]@{
        name = $_.Name
        isDirectory = $_.PSIsContainer
        size = if ($_.PSIsContainer) { $null } else { $_.Length }
        modifiedAt = $_.LastWriteTime.ToString("o")
      }
    } | ConvertTo-Json -Compress
  } finally {
    Remove-PSDrive -Name "${mountPoint}" -Force -ErrorAction SilentlyContinue
  }
} catch {
  Write-Output ("__ERROR__: " + $_.Exception.Message)
  exit 1
}
`;

  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      timeout: 30000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });
    const trimmed = stdout.trim();
    if (!trimmed) return [];
    const parsed = JSON.parse(trimmed) as NasDirectoryEntry[];
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    logger.error("nas browse failed", { host, share, subPath, error });
    throw new Error("NAS_BROWSE_FAILED");
  }
}

function escapePs(value: string): string {
  return value.replace(/'/g, "''").replace(/`/g, "``").replace(/\$/g, "`$");
}
