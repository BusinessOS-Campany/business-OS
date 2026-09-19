import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { PurchasesClient } from "@/components/purchases/purchases-client";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";
  const canManage = can(tenant, "purchase.manage");

  if (!canManage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية إدارة المشتريات" : "No permission to manage purchases"}</p>
      </div>
    );
  }

  const [purchases, suppliers, warehouses, pms, prods, branch] = await Promise.all([
    prisma.purchase.findMany({
      where: { companyId: tenant.companyId, branchId: tenant.branchId },
      select: {
        id: true, invoiceNo: true, invoiceDate: true, warehouseId: true,
        subtotal: true, discount: true, total: true, paidAmount: true, dueAmount: true,
        notes: true, createdAt: true,
        supplier: { select: { name: true, nameAr: true, nameEn: true } },
        branch: { select: { name: true, nameAr: true } },
        warehouse: { select: { name: true, nameAr: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    }),
    prisma.supplier.findMany({
      where: { companyId: tenant.companyId, isActive: true },
      select: { id: true, name: true, nameAr: true, phone: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, name: true, nameAr: true, isMain: true },
      orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
    }),
    prisma.paymentMethod.findMany({
      where: { companyId: tenant.companyId, isActive: true },
      select: { id: true, name: true, nameAr: true, nameEn: true, type: true, requiresReference: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: { companyId: tenant.companyId, isActive: true, trackInventory: true },
      select: { id: true, sku: true, nameAr: true, nameEn: true, price: true, cost: true, type: true },
      orderBy: [{ createdAt: "desc" }],
      take: 300,
    }),
    prisma.branch.findUnique({
      where: { id: tenant.branchId },
      select: { warehouseId: true },
    }),
  ]);

  const mainWarehouseId = warehouses.find((w) => w.isMain)?.id ?? branch?.warehouseId ?? warehouses[0]?.id ?? null;

  return (
    <PurchasesClient
      lang={lang}
      currency={tenant.currency}
      mainWarehouseId={mainWarehouseId}
      purchases={purchases.map((p) => ({
        id: p.id,
        invoiceNo: p.invoiceNo,
        invoiceDate: p.invoiceDate.toISOString(),
        subtotal: b2n(p.subtotal),
        discount: b2n(p.discount),
        total: b2n(p.total),
        paidAmount: b2n(p.paidAmount),
        dueAmount: b2n(p.dueAmount),
        notes: p.notes,
        itemCount: p._count.items,
        supplierName: lang === "ar" ? p.supplier.nameAr || p.supplier.name : p.supplier.nameEn || p.supplier.name,
        warehouseName: p.warehouse ? (lang === "ar" ? p.warehouse.nameAr || p.warehouse.name : p.warehouse.name) : "—",
        branchName: lang === "ar" ? p.branch.nameAr || p.branch.name : p.branch.name,
        createdByName: p.createdBy?.name ?? "",
      }))}
      suppliers={suppliers.map((s) => ({
        id: s.id,
        name: lang === "ar" ? s.nameAr || s.name : s.name,
      }))}
      warehouses={warehouses.map((w) => ({
        id: w.id,
        name: lang === "ar" ? w.nameAr || w.name : w.name,
        isMain: w.isMain,
      }))}
      paymentMethods={pms.map((m) => ({
        id: m.id,
        name: lang === "ar" ? m.nameAr || m.nameEn : m.nameEn || m.name,
        type: m.type,
        requiresReference: m.requiresReference,
      }))}
      products={prods.map((p) => ({
        id: p.id,
        sku: p.sku,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        price: b2n(p.price),
        cost: b2n(p.cost),
        type: p.type,
      }))}
    />
  );
}