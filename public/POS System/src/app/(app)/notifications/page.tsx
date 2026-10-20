import { prisma } from "@/lib/prisma";
import { getTenant } from "@/server/session";
import { NotificationsClient, type NotificationRow } from "@/components/notifications/notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  const notifications = await prisma.notification.findMany({
    where: { companyId: tenant.companyId, userId: tenant.user.id },
    select: { id: true, title: true, titleAr: true, body: true, bodyAr: true, type: true, read: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  const rows: NotificationRow[] = notifications.map((n) => ({
    id: n.id,
    title: lang === "ar" && n.titleAr ? n.titleAr : n.title,
    body: lang === "ar" && n.bodyAr ? n.bodyAr : n.body,
    type: n.type,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  return <NotificationsClient lang={lang} rows={rows} />;
}