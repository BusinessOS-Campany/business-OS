import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { decryptSecret, encryptSecret } from "./crypto";
import { listNasDirectory, listServerShares } from "./smb";
import { logger } from "@/lib/logger";

export interface NasShareInput {
  name: string;
  host: string;
  protocol?: string;
  share: string;
  username?: string | null;
  password?: string | null;
  basePath?: string | null;
  isActive?: boolean;
}

export interface NasShareView {
  id: string;
  name: string;
  host: string;
  protocol: string;
  share: string;
  username: string | null;
  basePath: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NasShareSecret extends NasShareView {
  password: string | null;
}

function toView(row: typeof schema.nasShares.$inferSelect): NasShareView {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    protocol: row.protocol,
    share: row.share,
    username: row.username,
    basePath: row.basePath,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listNasShares(): Promise<NasShareView[]> {
  const rows = await db.select().from(schema.nasShares).orderBy(schema.nasShares.name);
  return rows.map(toView);
}

export async function getNasShare(id: string): Promise<NasShareView | null> {
  const [row] = await db.select().from(schema.nasShares).where(eq(schema.nasShares.id, id));
  return row ? toView(row) : null;
}

export async function getActiveSharesWithSecret(): Promise<NasShareSecret[]> {
  const rows = await db
    .select()
    .from(schema.nasShares)
    .where(eq(schema.nasShares.isActive, true));
  return rows.map((row) => ({
    ...toView(row),
    password: row.passwordEnc ? decryptSecret(row.passwordEnc) : null,
  }));
}

export async function getShareSecret(id: string): Promise<NasShareSecret | null> {
  const [row] = await db.select().from(schema.nasShares).where(eq(schema.nasShares.id, id));
  if (!row) return null;
  return {
    ...toView(row),
    password: row.passwordEnc ? decryptSecret(row.passwordEnc) : null,
  };
}

export async function createNasShare(input: NasShareInput): Promise<NasShareView> {
  const [row] = await db
    .insert(schema.nasShares)
    .values({
      name: input.name,
      host: input.host,
      protocol: input.protocol ?? "SMB",
      share: input.share,
      username: input.username ?? null,
      passwordEnc: input.password ? encryptSecret(input.password) : null,
      basePath: input.basePath?.trim() ? input.basePath.trim() : null,
      isActive: input.isActive ?? true,
    })
    .returning();
  return toView(row);
}

export async function updateNasShare(id: string, input: Partial<NasShareInput>): Promise<NasShareView | null> {
  const patch: Record<string, unknown> = {
    name: input.name,
    host: input.host,
    protocol: input.protocol,
    share: input.share,
    username: input.username,
    basePath: input.basePath?.trim() ? input.basePath.trim() : null,
    isActive: input.isActive,
    updatedAt: new Date(),
  };
  if (input.password) {
    patch.passwordEnc = encryptSecret(input.password);
  }
  const [row] = await db
    .update(schema.nasShares)
    .set(patch)
    .where(eq(schema.nasShares.id, id))
    .returning();
  return row ? toView(row) : null;
}

export async function deleteNasShare(id: string): Promise<boolean> {
  const result = await db.delete(schema.nasShares).where(eq(schema.nasShares.id, id));
  return result.rowCount ? result.rowCount > 0 : false;
}

export function shareRoot(share: Pick<NasShareView, "host" | "share">): string {
  return `\\\\${share.host}\\${share.share}`;
}

export function fullSourcePath(
  share: Pick<NasShareView, "host" | "share" | "basePath">,
  subPath: string | null,
): string {
  const root = shareRoot(share);
  const base = (share.basePath ?? "").replace(/^[\\/]+|[\\/]+$/g, "");
  const parts = [root, base, subPath ?? ""].filter((part) => part.length > 0);
  return parts.join("\\");
}

export function normalizeRemotePath(value: string): string {
  return value.trim().replace(/[\\/]+/g, "/").replace(/^\/+|\/+$/g, "");
}

export interface ServerSourceOption {
  path: string;
  host: string;
  share: string;
  shareId: string | null;
  label: string;
}

const sourceOptionsCache = new Map<string, { ts: number; options: ServerSourceOption[] }>();
const SOURCE_OPTIONS_TTL_MS = 30_000;

async function resolveShareId(host: string, share: string): Promise<string | null> {
  const [row] = await db
    .select({ id: schema.nasShares.id })
    .from(schema.nasShares)
    .where(and(eq(schema.nasShares.host, host), eq(schema.nasShares.share, share)));
  return row?.id ?? null;
}

export async function resolveNasShareId(host: string, share: string): Promise<string | null> {
  return resolveShareId(host, share);
}

/**
 * Enumerates every disk share on a NAS host plus each share's top-level
 * folders, so an agent can be pointed at any folder the server exposes.
 * Results are cached briefly because every call touches the network.
 */
export async function enumerateServerSources(host: string): Promise<ServerSourceOption[]> {
  const cached = sourceOptionsCache.get(host);
  if (cached && Date.now() - cached.ts < SOURCE_OPTIONS_TTL_MS) {
    return cached.options;
  }

  const shares = await listServerShares(host);
  const options: ServerSourceOption[] = [];

  for (const share of shares) {
    if (share.endsWith("$")) continue;
    const shareId = await resolveShareId(host, share);
    const secret = shareId ? await getShareSecret(shareId) : null;

    options.push({
      path: shareRoot({ host, share }),
      host,
      share,
      shareId,
      label: share,
    });

    try {
      const entries = await listNasDirectory(
        host,
        share,
        "",
        secret?.username ?? null,
        secret?.password ?? null,
      );
      for (const entry of entries) {
        if (!entry.isDirectory) continue;
        options.push({
          path: `\\\\${host}\\${share}\\${entry.name}`,
          host,
          share,
          shareId,
          label: `${share}\\${entry.name}`,
        });
      }
    } catch (error) {
      logger.warn("share listing skipped", { host, share, error });
    }
  }

  sourceOptionsCache.set(host, { ts: Date.now(), options });
  return options;
}
