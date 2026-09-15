import { requireUser, toClientUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBrand } from "@/lib/services/hospital";
import { AppShellClient } from "@/components/app/app-shell-client";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [brand, notifications] = await Promise.all([
    getBrand(),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        link: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <AppShellClient
      user={toClientUser(user)}
      brandName={brand.nameEn}
      notifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        link: n.link,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      }))}
      unreadCount={unreadCount}
    >
      {children}
    </AppShellClient>
  );
}