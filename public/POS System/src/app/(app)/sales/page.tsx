import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { SalesClient } from "@/components/sales/sales-client";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";
  const canView = can(tenant, "invoice.view");
  const canRefund = can(tenant, "sale.refund");

  if (!canView) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية عرض المبيعات" : "No permission to view sales"}</p>
      </div>
    );
  }

  const sales = await prisma.sale.findMany({
    where: { companyId: tenant.companyId, branchId: tenant.branchId, status: { not: "HELD" } },
    select: {
      id: true, invoiceNo: true, type: true, status: true, subtotal: true, discount: true,
      discountPercent: true, tax: true, total: true, costTotal: true, profit: true,
      paidAmount: true, changeAmount: true, dueAmount: true, notes: true,
      holdKey: true, createdAt: true, closedAt: true,
      customer: { select: { id: true, name: true, nameAr: true, nameEn: true } },
      cashier: { select: { name: true } },
      branch: { select: { name: true, nameAr: true } },
      items: {
        select: {
          id: true, productId: true, nameAr: true, nameEn: true, sku: true,
          quantity: true, price: true, cost: true, total: true,
        },
      },
      payments: {
        select: { id: true, methodNameAr: true, methodNameEn: true, methodType: true, amount: true, reference: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });

  return (
    <SalesClient
      lang={lang}
      currency={tenant.currency}
      canRefund={canRefund}
      sales={sales.map((s) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        type: s.type,
        status: s.status as "COMPLETED" | "REFUNDED" | "PARTIALLY_REFUNDED",
        subtotal: b2n(s.subtotal),
        discount: b2n(s.discount),
        discountPercent: Number(s.discountPercent),
        tax: b2n(s.tax),
        total: b2n(s.total),
        profit: b2n(s.profit),
        paidAmount: b2n(s.paidAmount),
        changeAmount: b2n(s.changeAmount),
        dueAmount: b2n(s.dueAmount),
        notes: s.notes,
        createdAt: s.createdAt.toISOString(),
        customerId: s.customer?.id ?? null,
        customerName: s.customer ? (lang === "ar" ? s.customer.nameAr || s.customer.name : s.customer.nameEn || s.customer.name) : "",
        cashierName: s.cashier.name,
        items: s.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          name: lang === "ar" ? i.nameAr || i.nameEn : i.nameEn || i.nameAr,
          sku: i.sku,
          quantity: b2n(i.quantity),
          price: b2n(i.price),
          cost: b2n(i.cost),
          total: b2n(i.total),
        })),
        payments: s.payments.map((p) => ({
          id: p.id,
          methodName: lang === "ar" ? p.methodNameAr || p.methodNameEn : p.methodNameEn || p.methodNameAr,
          methodType: p.methodType,
          amount: b2n(p.amount),
          reference: p.reference,
        })),
      }))}
    />
  );
}