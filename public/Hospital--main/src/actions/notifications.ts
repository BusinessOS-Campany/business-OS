"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/services/audit";
import type { ActionResult } from "@/lib/result";

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.notification.update({
    where: { id: notificationId, userId: user.id },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

export async function createSystemNotificationAction(params: {
  roleId?: string;
  title: string;
  body?: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "DANGER";
  link?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.isAdmin) return { ok: false, error: "common.unauthorized" };
  await prisma.notification.create({
    data: {
      roleId: params.roleId ?? null,
      title: params.title,
      body: params.body,
      type: params.type,
      link: params.link,
    },
  });
  await audit({
    userId: user.id,
    action: "create",
    module: "notifications",
    description: `System notification: ${params.title}`,
  });
  return { ok: true };
}