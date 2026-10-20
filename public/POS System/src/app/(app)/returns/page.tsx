import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { ReturnsClient } from "@/components/returns/returns-client";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "sale.refund") && !can(tenant, "invoice.view")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية عرض المرتجعات" : "No permission to view returns"}</p>
      </div>
    );
  }

  const returns = await prisma.saleReturn.findMany({
    where: { companyId: tenant.companyId, branchId: tenant.branchId },
    select: {
      id: true, returnNo: true, reason: true, refundMethod: true,
      refundAmount: true, createdAt: true, note: true,
      sale: { select: { invoiceNo: true } },
      customer: { select: { id: true, name: true, nameAr: true, nameEn: true } },
      createdBy: { select: { name: true } },
      items: {
        select: {
          id: true, quantity: true, price: true, total: true,
          product: { select: { nameAr: true, nameEn: true } },
          saleItem: { select: { nameAr: true, nameEn: true } },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });

  return (
    <ReturnsClient
      lang={lang}
      currency={tenant.currency}
      returns={returns.map((r) => ({
        id: r.id,
        returnNo: r.returnNo,
        invoiceNo: r.sale.invoiceNo,
        reason: r.reason,
        refundMethod: r.refundMethod,
        refundAmount: b2n(r.refundAmount),
        createdAt: r.createdAt.toISOString(),
        note: r.note,
        customerName: r.customer ? (lang === "ar" ? r.customer.nameAr || r.customer.name : r.customer.nameEn || r.customer.name) : "",
        createdByName: r.createdBy.name,
        items: r.items.map((i) => ({
          id: i.id,
          name: lang === "ar" ? i.product?.nameAr || i.saleItem.nameAr || i.saleItem.nameEn : i.product?.nameEn || i.saleItem.nameEn || i.saleItem.nameAr,
          quantity: b2n(i.quantity),
          price: b2n(i.price),
          total: b2n(i.total),
        })),
      }))}
    />
  );
}