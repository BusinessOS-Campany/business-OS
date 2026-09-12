import type { Prisma } from "@/core/db/generated/prisma/client";

export interface AuditEntry {
  action: string; // e.g. "product.created", "sale.confirmed"
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  actorUserId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Append-only audit trail. MUST be called inside the same transaction as the
 * business change it describes (pass the tx client). organizationId is null
 * for platform-realm events. Never throws upward: audit failure aborts the tx
 * by design when used inside $transaction.
 */
export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  tenant: { organizationId?: string | null; userId?: string },
  entry: AuditEntry,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      organizationId: tenant.organizationId ?? null,
      actorUserId: entry.actorUserId ?? tenant.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: (entry.before ?? undefined) as never,
      after: (entry.after ?? undefined) as never,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    },
  });
}
