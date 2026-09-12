import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { NotificationsView } from "@/components/notifications/notifications-view";

export const metadata = {
  title: "الإشعارات",
  description: "عرض جميع الإشعارات",
};

export default async function NotificationsPage() {
  await requireUser();

  return (
    <>
      <PageHeader titleKey="header.notifications" />
      <div className="relative flex w-full flex-col overflow-hidden min-h-[calc(100dvh-14rem)]">
        <div
          className="pointer-events-none absolute -top-10 -end-16 size-60 rounded-full bg-destructive/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-12 -start-16 size-60 rounded-full bg-warning/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex-1">
          <NotificationsView />
        </div>
      </div>
    </>
  );
}
