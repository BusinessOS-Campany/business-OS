interface AuditClient {
  auditLog: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

interface AuditInput {
  companyId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  ip?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Append an audit trail record. `client` may be the global `prisma` or a
 * transactional client (`tx`) so records are written atomically with the
 * operation that produces them.
 */
export function writeAudit(client: AuditClient, input: AuditInput) {
  return client.auditLog.create({
    data: {
      companyId: input.companyId,
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? "",
      ip: input.ip ?? "",
      oldValue: input.oldValue as never,
      newValue: input.newValue as never,
    },
  });
}