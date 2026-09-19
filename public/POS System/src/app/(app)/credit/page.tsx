import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { fromMinor } from "@/lib/money";
import { CreditClient, type ReceivableRow, type PayableRow } from "@/components/credit/credit-client";

export const dynamic = "force-dynamic";

export default async function CreditPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  const allowCredit = can(tenant, "credit.manage");
  const allowPurchase = can(tenant, "purchase.manage");
  if (!allowCredit && !allowPurchase) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية الذمم" : "No permission to view credit & debt"}</p>
      </div>
    );
  }

  const [customers, suppliers, purchases, methods] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, name: true, nameAr: true, phone: true, balance: true, openingBalance: true, creditLimit: true },
      orderBy: { balance: "desc" },
    }),
    prisma.supplier.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, name: true, nameAr: true, phone: true, openingBalance: true },
      orderBy: { name: "asc" },
    }),
    prisma.purchase.findMany({
      where: { companyId: tenant.companyId },
      select: { supplierId: true, dueAmount: true },
    }),
    prisma.paymentMethod.findMany({
      where: { companyId: tenant.companyId, isActive: true },
      select: { id: true, nameAr: true, nameEn: true, type: true },
    }),
  ]);

  const receivableRows: ReceivableRow[] = customers
    .filter((c) => c.balance > 0n)
    .map((c) => ({
      id: c.id,
      name: lang === "ar" && c.nameAr ? c.nameAr : c.name,
      phone: c.phone,
      balance: fromMinor(Number(c.balance)),
      creditLimit: fromMinor(Number(c.creditLimit)),
    }));

  const payableBySupplier = new Map<string, bigint>();
  for (const s of suppliers) payableBySupplier.set(s.id, s.openingBalance);
  for (const p of purchases) {
    if (p.supplierId) payableBySupplier.set(p.supplierId, (payableBySupplier.get(p.supplierId) ?? 0n) + p.dueAmount);
  }
  const payableRows: PayableRow[] = suppliers
    .filter((s) => (payableBySupplier.get(s.id) ?? 0n) > 0n)
    .map((s) => ({
      id: s.id,
      name: lang === "ar" && s.nameAr ? s.nameAr : s.name,
      phone: s.phone,
      payable: fromMinor(Number(payableBySupplier.get(s.id) ?? 0n)),
    }));

  return (
    <CreditClient
      lang={lang}
      canCredit={allowCredit}
      canPurchase={allowPurchase}
      receivableRows={receivableRows}
      payableRows={payableRows}
      methods={methods.map((m) => ({ id: m.id, name: lang === "ar" ? m.nameAr || m.nameEn : m.nameEn || m.nameAr, type: m.type }))}
    />
  );
}