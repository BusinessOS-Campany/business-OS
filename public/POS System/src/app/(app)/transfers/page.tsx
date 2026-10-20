import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { TransfersClient } from "@/components/transfers/transfers-client";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";
  const canManage = can(tenant, "transfer.manage");

  if (!canManage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية إدارة التحويلات" : "No permission to manage transfers"}</p>
      </div>
    );
  }

  const [transfers, warehouses, prods, branch] = await Promise.all([
    prisma.stockTransfer.findMany({
      where: { companyId: tenant.companyId },
      select: {
        id: true, fromWarehouseId: true, toWarehouseId: true, status: true, itemCount: true,
        note: true, createdAt: true, approvedAt: true, receivedAt: true,
        fromWarehouse: { select: { name: true, nameAr: true } },
        toWarehouse: { select: { name: true, nameAr: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        receivedBy: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    }),
    prisma.warehouse.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, name: true, nameAr: true, isMain: true },
      orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
    }),
    prisma.product.findMany({
      where: { companyId: tenant.companyId, isActive: true, trackInventory: true },
      select: { id: true, sku: true, nameAr: true, nameEn: true, cost: true, type: true },
      orderBy: [{ createdAt: "desc" }],
      take: 300,
    }),
    prisma.branch.findUnique({
      where: { id: tenant.branchId },
      select: { warehouseId: true },
    }),
  ]);

  const defaultFrom = branch?.warehouseId ?? warehouses.find((w) => w.isMain)?.id ?? warehouses[0]?.id ?? null;
  const stockByWarehouse = new Map<string, Map<string, number>>();
  const invs = await prisma.inventory.findMany({
    where: { companyId: tenant.companyId, productId: { in: prods.map((p) => p.id) } },
    select: { productId: true, warehouseId: true, quantity: true },
  });
  for (const i of invs) {
    let m = stockByWarehouse.get(i.productId);
    if (!m) {
      m = new Map();
      stockByWarehouse.set(i.productId, m);
    }
    m.set(i.warehouseId, b2n(i.quantity));
  }

  return (
    <TransfersClient
      lang={lang}
      currency={tenant.currency}
      defaultFromWarehouseId={defaultFrom}
      warehouses={warehouses.map((w) => ({ id: w.id, name: lang === "ar" ? w.nameAr || w.name : w.name }))}
      products={prods.map((p) => ({
        id: p.id,
        sku: p.sku,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        cost: b2n(p.cost),
        warehouseStock: stockByWarehouse.get(p.id),
      }))}
      transfers={transfers.map((t) => ({
        id: t.id,
        fromWarehouseId: t.fromWarehouseId,
        toWarehouseId: t.toWarehouseId,
        fromName: lang === "ar" ? t.fromWarehouse.nameAr || t.fromWarehouse.name : t.fromWarehouse.name,
        toName: lang === "ar" ? t.toWarehouse.nameAr || t.toWarehouse.name : t.toWarehouse.name,
        status: t.status,
        itemCount: t.itemCount,
        note: t.note,
        createdAt: t.createdAt.toISOString(),
        approvedAt: t.approvedAt?.toISOString() ?? null,
        receivedAt: t.receivedAt?.toISOString() ?? null,
        createdByName: t.createdBy?.name ?? "",
        approvedByName: t.approvedBy?.name ?? "",
        receivedByName: t.receivedBy?.name ?? "",
      }))}
    />
  );
}