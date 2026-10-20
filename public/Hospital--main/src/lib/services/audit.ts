import "server-only";
import { prisma } from "@/lib/prisma";

interface AuditParams {
  userId?: string | null;
  action: string;
  module: string;
  recordId?: string | null;
  description?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
}

export async function audit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        module: params.module,
        recordId: params.recordId ?? null,
        description: params.description,
        oldValue: params.oldValue === undefined ? undefined : JSON.parse(JSON.stringify(params.oldValue)),
        newValue: params.newValue === undefined ? undefined : JSON.parse(JSON.stringify(params.newValue)),
        ip: params.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write audit log:", e);
  }
}