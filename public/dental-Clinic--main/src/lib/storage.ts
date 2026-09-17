import path from "path"
import fs from "fs/promises"
import crypto from "crypto"

const UPLOAD_ROOT =
  process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.length > 0
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), "serverdata", "uploads")

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024)

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

/** When Supabase Storage env vars are present, files live there; otherwise local disk. */
const SB_URL = process.env.SUPABASE_URL?.trim() ?? ""
const SB_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ""
const SB_BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "dental-clinic"
const useSupabaseStorage = SB_URL.length > 0 && SB_ROLE_KEY.length > 0

export function extOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : ""
}

export function mimeFromExt(fileName: string): string {
  return EXT_MIME[extOf(fileName)] ?? "application/octet-stream"
}

function safeExt(fileName: string): string {
  const ext = extOf(fileName)
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : "bin"
}

export interface StoredFile {
  fileName: string
  filePath: string
  mimeType: string
  sizeBytes: number
}

/* ── Supabase Storage helpers ───────────────────────────── */

async function ensureBucket(): Promise<void> {
  const res = await fetch(`${SB_URL}/storage/v1/bucket/${SB_BUCKET}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${SB_ROLE_KEY}` },
  })
  if (res.ok) return
  await fetch(`${SB_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SB_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: SB_BUCKET, name: SB_BUCKET, public: false }),
  })
}

async function sbUploadObject(objectPath: string, buffer: Buffer, mimeType: string): Promise<void> {
  await ensureBucket()
  const res = await fetch(`${SB_URL}/storage/v1/object/${SB_BUCKET}/${objectPath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${SB_ROLE_KEY}`,
      "Content-Type": mimeType || "application/octet-stream",
      "x-upsert": "true",
    },
    body: new Uint8Array(buffer),
  })
  if (!res.ok) {
    throw new Error(`storage_upload_failed:${res.status}`)
  }
}

async function sbDownloadObject(objectPath: string): Promise<Buffer | null> {
  const res = await fetch(`${SB_URL}/storage/v1/object/${SB_BUCKET}/${objectPath}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${SB_ROLE_KEY}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`storage_read_failed:${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function sbDeleteObjects(objectPath: string): Promise<void> {
  const res = await fetch(`${SB_URL}/storage/v1/object/${SB_BUCKET}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${SB_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [objectPath] }),
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`storage_delete_failed:${res.status}`)
  }
}

/* ── Local disk helpers ─────────────────────────────────── */

async function ensureRoot(): Promise<void> {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true })
}

function resolveFromRoot(relativePath: string): string | null {
  const target = path.resolve(UPLOAD_ROOT, relativePath)
  if (!target.startsWith(UPLOAD_ROOT + path.sep) && target !== UPLOAD_ROOT) return null
  return target
}

/* ── Public API ─────────────────────────────────────────── */

export async function saveFile(file: File, subdir: string): Promise<StoredFile> {
  if (file.size <= 0) throw new Error("empty_file")
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("file_too_large")
  const safeSub = subdir.replace(/[^a-z0-9_]/gi, "")
  const savedName = `${crypto.randomUUID()}.${safeExt(file.name)}`
  const rel = safeSub ? `${safeSub}/${savedName}` : savedName
  const mimeType = file.type || mimeFromExt(file.name)
  const buffer = Buffer.from(await file.arrayBuffer())

  if (useSupabaseStorage) {
    await sbUploadObject(rel, buffer, mimeType)
  } else {
    const target = resolveFromRoot(rel)
    if (!target) throw new Error("invalid_path")
    await ensureRoot()
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(/* turbopackIgnore: true */ target, buffer)
  }

  return {
    fileName: file.name,
    filePath: rel,
    mimeType,
    sizeBytes: file.size,
  }
}

export async function deleteFile(relativePath: string): Promise<void> {
  if (useSupabaseStorage) {
    await sbDeleteObjects(relativePath)
    return
  }
  const target = resolveFromRoot(relativePath)
  if (!target) return
  try {
    await fs.unlink(/* turbopackIgnore: true */ target)
  } catch {
    // not found — ignore
  }
}

export async function readStoredFile(relativePath: string): Promise<Buffer | null> {
  if (useSupabaseStorage) {
    return sbDownloadObject(relativePath)
  }
  const target = resolveFromRoot(relativePath)
  if (!target) return null
  try {
    return await fs.readFile(/* turbopackIgnore: true */ target)
  } catch {
    return null
  }
}