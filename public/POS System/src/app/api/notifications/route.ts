import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { ok, unauthorized, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  return { cred: { companyId: session.user.companyId, userId: session.user.id } };
}

export async function GET() {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { companyId: cred.companyId, userId: cred.userId },
        select: { id: true, title: true, titleAr: true, body: true, bodyAr: true, type: true, read: true, data: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.notification.count({
        where: { companyId: cred.companyId, userId: cred.userId, read: false },
      }),
    ]);
    return ok({
      data: {
        notifications: notifications.map((n) => ({
          id: n.id, title: n.title, titleAr: n.titleAr, body: n.body, bodyAr: n.bodyAr,
          type: n.type, read: n.read, data: n.data, createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
      },
    });
  } catch (e) {
    console.error("notifications list error", e);
    return serverError();
  }
}