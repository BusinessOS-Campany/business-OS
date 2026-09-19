import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { AuditClient, type LogRow } from "@/components/audit/audit-client";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "audit.view")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية سجل العمليات" : "No permission to view the audit log"}</p>
      </div>
    );
  }

  const rows = await prisma.auditLog.findMany({
    where: { companyId: tenant.companyId },
    select: {
      id: true, action: true, entity: true, entityId: true, ip: true, oldValue: true, newValue: true, createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const logRows: LogRow[] = rows.map((r) => ({
    id: r.id, action: r.action, entity: r.entity, entityId: r.entityId, ip: r.ip,
    oldValue: r.oldValue ?? null, newValue: r.newValue ?? null, createdAt: r.createdAt.toISOString(), userName: r.user?.name ?? "",
  }));

  return <AuditClient lang={lang} rows={logRows} />;
}