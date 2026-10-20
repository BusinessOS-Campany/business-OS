import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyBytes(): Buffer {
  const enc = process.env.NAS_ENC_KEY;
  if (enc && enc.length >= 64) {
    const hex = Buffer.from(enc, "hex");
    if (hex.length === 32) return hex;
  }
  const fallback = process.env.BETTER_AUTH_SECRET ?? "celia-nas-secret";
  return createHash("sha256").update(fallback).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv("aes-256-gcm", keyBytes(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
