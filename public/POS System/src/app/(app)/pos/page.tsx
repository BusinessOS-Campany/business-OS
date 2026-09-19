import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { PosScreen } from "@/components/pos/pos-screen";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!tenant.branchId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">
          {lang === "ar"
            ? "يرجى اختيار فرع من القائمة الجانبية أولاً لفتح نقطة البيع"
            : "Please select a branch from the sidebar to open the POS"}
        </p>
      </div>
    );
  }

  const canOverridePrice = can(tenant, "price.override");
  const canDiscount = can(tenant, "discount.apply");
  const canHold = can(tenant, "sale.hold");
  const canSell = can(tenant, "sale.create");

  if (!canSell) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">
          {lang === "ar" ? "ليست لديك صلاحية البيع" : "You do not have permission to sell"}
        </p>
      </div>
    );
  }

  const branch = await prisma.branch.findUnique({
    where: { id: tenant.branchId },
    select: { id: true, name: true, nameAr: true, warehouseId: true },
  });
  if (!branch) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "الفرع غير موجود" : "Branch not found"}</p>
      </div>
    );
  }

  let warehouseId = branch.warehouseId;
  if (!warehouseId) {
    const main = await prisma.warehouse.findFirst({ where: { companyId: tenant.companyId, isMain: true } });
    warehouseId = main?.id ?? null;
  }

  const [categories, prods, customers, pms, heldRows] = await Promise.all([
    prisma.category.findMany({
      where: { companyId: tenant.companyId, isActive: true },
      select: { id: true, name: true, nameAr: true, icon: true, color: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: { companyId: tenant.companyId, isActive: true },
      select: {
        id: true, nameAr: true, nameEn: true, price: true, cost: true, barcode: true, sku: true,
        isFavorite: true, categoryId: true, minStock: true, trackInventory: true,
        allowNegativeStock: true, type: true,
        unit: { select: { name: true, nameAr: true } },
      },
      orderBy: [{ isFavorite: "desc" }, { createdAt: "asc" }],
    }),
    prisma.customer.findMany({
      where: { companyId: tenant.companyId, isActive: true },
      select: { id: true, name: true, nameAr: true, phone: true, type: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.paymentMethod.findMany({
      where: { companyId: tenant.companyId, isActive: true },
      select: { id: true, name: true, nameAr: true, nameEn: true, type: true, requiresReference: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.sale.findMany({
      where: { companyId: tenant.companyId, branchId: tenant.branchId, status: "HELD" },
      include: { items: { select: { productId: true, quantity: true, price: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const stockByProduct = new Map<string, number>();
  if (warehouseId) {
    const invs = await prisma.inventory.findMany({
      where: { productId: { in: prods.map((p) => p.id) }, warehouseId },
      select: { productId: true, quantity: true },
    });
    for (const i of invs) stockByProduct.set(i.productId, b2n(i.quantity));
  }

  const products = prods.map((p) => ({
    id: p.id,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    price: b2n(p.price),
    cost: b2n(p.cost),
    barcode: p.barcode,
    sku: p.sku,
    isFavorite: p.isFavorite,
    categoryId: p.categoryId,
    minStock: Number(String(p.minStock ?? 0)),
    trackInventory: p.trackInventory,
    allowNegativeStock: p.allowNegativeStock,
    type: p.type,
    unitName: lang === "ar" ? p.unit?.nameAr || p.unit?.name || "" : p.unit?.name || "",
    stock: stockByProduct.get(p.id) ?? 0,
  }));

  return (
    <PosScreen
      lang={lang}
      currency={tenant.currency}
      companyName={tenant.companyName}
      branch={{ id: branch.id, name: lang === "ar" ? branch.nameAr || branch.name : branch.name }}
      categories={categories.map((c) => ({ id: c.id, name: lang === "ar" ? c.nameAr || c.name : c.name, icon: c.icon, color: c.color }))}
      products={products}
      customers={customers.map((c) => ({
        id: c.id,
        name: lang === "ar" ? c.nameAr || c.name : c.name || c.nameAr,
        phone: c.phone,
        type: c.type,
      }))}
      paymentMethods={pms.map((m) => ({
        id: m.id,
        name: lang === "ar" ? m.nameAr || m.nameEn : m.nameEn || m.name,
        type: m.type,
        requiresReference: m.requiresReference,
      }))}
      heldSales={heldRows.map((s) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        total: b2n(s.total),
        createdAt: s.createdAt.toISOString(),
        items: s.items.map((i) => ({ productId: i.productId ?? "", quantity: b2n(i.quantity), price: b2n(i.price) })),
      }))}
      permissions={{ canOverridePrice, canDiscount, canHold }}
    />
  );
}