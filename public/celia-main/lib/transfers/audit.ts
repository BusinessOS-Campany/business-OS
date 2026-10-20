import { db, schema } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface AuditMeta {
  [key: string]: unknown;
}

export interface AuditInput {
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  metadata?: AuditMeta | null;
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(schema.auditLog).values({
      userId: input.userId ?? null,
      action: input.action,
      ipAddress: input.ipAddress ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        ...(input.entityType ? { entityType: input.entityType } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
      },
    });
  } catch (error) {
    logger.error("audit log write failed", { error });
  }
}
