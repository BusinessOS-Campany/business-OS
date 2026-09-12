import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export interface TransferJobInput {
  deviceId: string;
  nasShareId: string;
  sourcePath: string;
  destinationPath: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerNotes?: string | null;
}

export function createTransferJobSchema(t: Dictionary) {
  return z.object({
    deviceId: z.string().min(1, t.transfers.validation.deviceRequired),
    nasShareId: z.string().min(1, t.transfers.validation.shareRequired),
    sourcePath: z
      .string()
      .max(500, t.transfers.validation.pathTooLong)
      .refine((value) => sanitizeSubPath(value) !== null, t.transfers.validation.invalidPath),
    destinationPath: z
      .string()
      .min(3, t.transfers.validation.destRequired)
      .max(500, t.transfers.validation.pathTooLong),
    customerName: z.string().max(120).optional().or(z.literal("")),
    customerPhone: z.string().max(40).optional().or(z.literal("")),
    customerNotes: z.string().max(500).optional().or(z.literal("")),
  });
}

export type TransferJobParsed = z.infer<ReturnType<typeof createTransferJobSchema>>;

/**
 * Normalizes an employee-provided relative path inside a NAS share.
 * Rejects absolute paths, drive letters, `..` traversal and invalid characters.
 * Returns null when the input is not a safe relative path.
 */
export function sanitizeSubPath(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\\/]+/g, "/").replace(/^\/+|\/+$/g, "");
  if (!cleaned) return null;
  const parts = cleaned.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) return null;
  if (parts.some((part) => /[\\:*?"<>|]/.test(part))) return null;
  if (/^[a-zA-Z]:/.test(cleaned)) return null;
  return parts.join("/");
}

/** Extracts the drive letter (uppercase, with colon) from an absolute destination path. */
export function extractDriveLetter(destinationPath: string): string | null {
  const match = destinationPath.trim().match(/^([a-zA-Z]):[\\/]/);
  return match ? match[1].toUpperCase() : null;
}

/** Checks that `full` (a Windows path) is inside `base` (a Windows directory). */
export function isWithinBasePath(full: string, base: string | null | undefined): boolean {
  if (!base) return true;
  const a = full.toLowerCase().replace(/[\\/]+$/, "");
  const b = base.toLowerCase().replace(/[\\/]+$/, "");
  return a === b || a.startsWith(b + "\\");
}
