export interface ByteUnits {
  B: string;
  KB: string;
  MB: string;
  GB: string;
  TB: string;
  PB: string;
}

export function formatBytes(bytes: number | null | undefined, units: ByteUnits): string {
  if (bytes == null || bytes < 0 || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return `0 ${units.B}`;
  const steps = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
  const index = Math.min(steps.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  const formatted = value >= 100 ? Math.round(value).toString() : value.toFixed(1);
  return `${formatted} ${units[steps[index]]}`;
}

export function formatSpeed(bytesPerSecond: number | null | undefined, units: ByteUnits): string {
  if (bytesPerSecond == null || bytesPerSecond < 0 || Number.isNaN(bytesPerSecond)) return "—";
  return `${formatBytes(bytesPerSecond, units)}/s`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0 || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${rest}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function formatDateTime(value: Date | string | null | undefined, locale: string): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
