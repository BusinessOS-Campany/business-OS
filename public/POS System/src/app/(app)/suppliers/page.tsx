import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { SuppliersClient } from "@/components/suppliers/suppliers-client";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";
  const canManage = can(tenant, "supplier.manage");

  if (!canManage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية إدارة الموردين" : "No permission to manage suppliers"}</p>
      </div>
    );
  }

  const [suppliers, purchaseGroup] = await Promise.all([
    prisma.supplier.findMany({
      where: { companyId: tenant.companyId },
      select: {
        id: true, name: true, nameAr: true, nameEn: true, companyName: true, type: true,
        phone: true, phoneAlt: true, email: true, address: true, governorate: true, district: true,
        contactPerson: true, taxNumber: true, paymentTerms: true, creditLimit: true, openingBalance: true,
        notes: true, isActive: true, createdAt: true,
        _count: { select: { purchases: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.purchase.groupBy({
      by: ["supplierId"],
      where: { companyId: tenant.companyId },
      _sum: { total: true, paidAmount: true, dueAmount: true },
      _max: { createdAt: true },
    }),
  ]);

  const purBySupplier = new Map(purchaseGroup.map((g) => [g.supplierId, g]));

  return (
    <SuppliersClient
      lang={lang}
      currency={tenant.currency}
      suppliers={suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        nameAr: s.nameAr,
        nameEn: s.nameEn,
        companyName: s.companyName,
        type: s.type,
        phone: s.phone,
        phoneAlt: s.phoneAlt,
        email: s.email,
        address: s.address,
        governorate: s.governorate,
        district: s.district,
        contactPerson: s.contactPerson,
        taxNumber: s.taxNumber,
        paymentTerms: s.paymentTerms,
        creditLimit: b2n(s.creditLimit),
        openingBalance: b2n(s.openingBalance),
        notes: s.notes,
        isActive: s.isActive,
        purchaseCount: s._count.purchases,
        totalPurchases: b2n(purBySupplier.get(s.id)?._sum.total ?? 0n),
        totalPaid: b2n(purBySupplier.get(s.id)?._sum.paidAmount ?? 0n),
        totalDue: b2n(purBySupplier.get(s.id)?._sum.dueAmount ?? 0n),
        lastPurchaseAt: purBySupplier.get(s.id)?._max.createdAt?.toISOString() ?? null,
      }))}
    />
  );
}