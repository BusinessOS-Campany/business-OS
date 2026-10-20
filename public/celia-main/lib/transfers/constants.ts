export const TRANSFER_STATUSES = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "PAUSED",
] as const;

export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const DEVICE_TYPES = [
  "USB_FLASH",
  "MOBILE_PHONE",
  "SD_CARD",
  "MICRO_SD",
  "EXTERNAL_HDD",
  "EXTERNAL_SSD",
  "INTERNAL",
  "UNKNOWN",
] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

export const AGENT_ONLINE_WINDOW_MS = 60_000;

/**
 * Reserved value stored in `transferJobs.customerNotes` for transfers that were
 * auto-detected by the agent after a manual copy from Windows Explorer (as
 * opposed to a job created through the web UI). Used by the UI to badge them.
 */
export const MANUAL_COPY_MARKER = "MANUAL_COPY";

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  USB_FLASH: "USB Flash",
  MOBILE_PHONE: "Mobile Phone",
  SD_CARD: "SD Card",
  MICRO_SD: "MicroSD",
  EXTERNAL_HDD: "External HDD",
  EXTERNAL_SSD: "External SSD",
  INTERNAL: "Internal",
  UNKNOWN: "Unknown",
};
