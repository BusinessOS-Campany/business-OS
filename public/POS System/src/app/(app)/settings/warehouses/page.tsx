import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { WarehousesClient } from "@/components/settings/warehouses-client";

export const dynamic = "force-dynamic";

export default async function WarehousesPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "warehouse.manage") && !can(tenant, "settings.manage")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية إدارة المخازن" : "No permission to manage warehouses"}</p>
      </div>
    );
  }

  const warehouses = await prisma.warehouse.findMany({
    where: { companyId: tenant.companyId },
    select: {
      id: true, name: true, nameAr: true, code: true, address: true, phone: true,
      managerName: true, isMain: true, status: true,
      _count: { select: { inventory: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <WarehousesClient
      lang={lang}
      canManage={can(tenant, "warehouse.manage")}
      warehouses={warehouses.map((w) => ({
        id: w.id, name: w.name, nameAr: w.nameAr, code: w.code, address: w.address,
        phone: w.phone, managerName: w.managerName, isMain: w.isMain, status: w.status,
        skuCount: w._count.inventory,
      }))}
    />
  );
}