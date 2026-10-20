import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { CustomersClient } from "@/components/customers/customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";
  const canManage = can(tenant, "customer.manage");

  if (!canManage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية إدارة العملاء" : "No permission to manage customers"}</p>
      </div>
    );
  }

  const [customers, salesGroup] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: tenant.companyId },
      select: {
        id: true, number: true, name: true, nameAr: true, nameEn: true,
        phone: true, phoneAlt: true, email: true, address: true, governorate: true, district: true,
        type: true, creditLimit: true, openingBalance: true, balance: true, notes: true, isActive: true,
        createdAt: true,
        _count: { select: { sales: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.sale.groupBy({
      by: ["customerId"],
      where: { companyId: tenant.companyId, customerId: { not: null } },
      _max: { createdAt: true },
    }),
  ]);

  const lastSaleAt = new Map(salesGroup.map((g) => [g.customerId!, g._max.createdAt]));

  return (
    <CustomersClient
      lang={lang}
      currency={tenant.currency}
      customers={customers.map((c) => ({
        id: c.id,
        number: c.number,
        name: c.name,
        nameAr: c.nameAr,
        nameEn: c.nameEn,
        phone: c.phone,
        phoneAlt: c.phoneAlt,
        email: c.email,
        address: c.address,
        governorate: c.governorate,
        district: c.district,
        type: c.type,
        creditLimit: b2n(c.creditLimit),
        openingBalance: b2n(c.openingBalance),
        balance: b2n(c.balance),
        notes: c.notes,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        saleCount: c._count.sales,
        lastSaleAt: lastSaleAt.get(c.id)?.toISOString() ?? null,
      }))}
    />
  );
}