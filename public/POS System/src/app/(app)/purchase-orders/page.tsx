import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { fromMinor } from "@/lib/money";
import { PurchaseOrdersClient, type PORow, type POItemRow } from "@/components/purchase-orders/purchase-orders-client";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "purchase.manage")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية المشتريات" : "No permission to manage purchases"}</p>
      </div>
    );
  }

  const [orders, suppliers, branches, products, warehouses, methods] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { companyId: tenant.companyId },
      select: {
        id: true, orderNo: true, status: true, total: true, expectedAt: true, createdAt: true,
        supplier: { select: { id: true, name: true, nameAr: true } },
        branch: { select: { id: true, name: true, nameAr: true } },
        items: { include: { product: { select: { id: true, nameAr: true, nameEn: true, sku: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.supplier.findMany({ where: { companyId: tenant.companyId, isActive: true }, select: { id: true, name: true, nameAr: true } }),
    prisma.branch.findMany({ where: { companyId: tenant.companyId }, select: { id: true, name: true, nameAr: true } }),
    prisma.product.findMany({ where: { companyId: tenant.companyId }, select: { id: true, nameAr: true, nameEn: true, sku: true } }),
    prisma.warehouse.findMany({ where: { companyId: tenant.companyId }, select: { id: true, name: true, nameAr: true } }),
    prisma.paymentMethod.findMany({ where: { companyId: tenant.companyId, isActive: true }, select: { id: true, nameAr: true, nameEn: true } }),
  ]);

  const orderRows: PORow[] = orders.map((o) => ({
    id: o.id, orderNo: o.orderNo, status: o.status, total: fromMinor(Number(o.total)),
    expectedAt: o.expectedAt?.toISOString() ?? null, createdAt: o.createdAt.toISOString(),
    supplierName: lang === "ar" ? o.supplier.nameAr || o.supplier.name : o.supplier.name,
    branchName: lang === "ar" ? o.branch.nameAr || o.branch.name : o.branch.name,
  }));

  const openOrderDetail = (o: (typeof orders)[0]) => ({
    id: o.id, orderNo: o.orderNo, status: o.status, total: fromMinor(Number(o.total)), createdAt: o.createdAt.toISOString(),
    supplierName: lang === "ar" ? o.supplier.nameAr || o.supplier.name : o.supplier.name,
    branchName: lang === "ar" ? o.branch.nameAr || o.branch.name : o.branch.name,
    expectedAt: o.expectedAt?.toISOString() ?? null,
    items: o.items.map((it) => ({
      id: it.id, productId: it.productId, name: lang === "ar" ? it.product.nameAr || it.product.nameEn : it.product.nameEn || it.product.nameAr, sku: it.product.sku,
      quantity: fromMinor(Number(it.quantity)), price: fromMinor(Number(it.price)), total: fromMinor(Number(it.total)),
      receivedQty: fromMinor(Number(it.receivedQty)),
    } as POItemRow)),
  });

  return (
    <PurchaseOrdersClient
      lang={lang}
      orders={orderRows}
      orderDetails={orders.map(openOrderDetail)}
      suppliers={suppliers.map((s) => ({ id: s.id, name: lang === "ar" ? s.nameAr || s.name : s.name }))}
      branches={branches.map((b) => ({ id: b.id, name: lang === "ar" ? b.nameAr || b.name : b.name }))}
      products={products.map((p) => ({ id: p.id, name: lang === "ar" ? p.nameAr || p.nameEn : p.nameEn || p.nameAr, sku: p.sku }))}
      warehouses={warehouses.map((w) => ({ id: w.id, name: lang === "ar" ? w.nameAr || w.name : w.name }))}
      methods={methods.map((m) => ({ id: m.id, name: lang === "ar" ? m.nameAr || m.nameEn : m.nameEn || m.nameAr }))}
    />
  );
}