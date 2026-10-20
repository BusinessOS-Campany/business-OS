import { db, schema } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface CreateNotificationInput {
  type: string;
  action: string;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    await db.insert(schema.notifications).values({
      type: input.type,
      action: input.action,
      messageKey: input.messageKey,
      messageParams: input.messageParams ?? null,
      entityId: input.entityId ?? null,
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      isRead: false,
    });
  } catch (error) {
    logger.error("createNotification failed", { error, type: input.type, action: input.action });
  }
}
