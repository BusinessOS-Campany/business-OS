import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { BranchesClient } from "@/components/settings/branches-client";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "branch.manage") && !can(tenant, "settings.manage")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية إدارة الفروع" : "No permission to manage branches"}</p>
      </div>
    );
  }

  const branches = await prisma.branch.findMany({
    where: { companyId: tenant.companyId },
    select: {
      id: true, name: true, nameAr: true, code: true, address: true, phone: true,
      managerName: true, status: true, warehouseId: true,
      warehouse: { select: { name: true, nameAr: true } },
      _count: { select: { users: true, sales: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const warehouses = await prisma.warehouse.findMany({
    where: { companyId: tenant.companyId },
    select: { id: true, name: true, nameAr: true, isMain: true },
  });

  return (
    <BranchesClient
      lang={lang}
      canManage={can(tenant, "branch.manage")}
      branches={branches.map((b) => ({
        id: b.id, name: b.name, nameAr: b.nameAr, code: b.code,
        address: b.address, phone: b.phone, managerName: b.managerName,
        status: b.status, warehouseId: b.warehouseId,
        warehouseName: b.warehouse ? (lang === "ar" ? b.warehouse.nameAr || b.warehouse.name : b.warehouse.name || b.warehouse.nameAr) : "",
        userCount: b._count.users, saleCount: b._count.sales,
      }))}
      warehouses={warehouses.map((w) => ({ id: w.id, name: lang === "ar" ? w.nameAr || w.name : w.name || w.nameAr }))}
    />
  );
}