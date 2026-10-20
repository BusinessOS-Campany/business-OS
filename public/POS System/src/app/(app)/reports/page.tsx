import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { ReportsClient } from "@/components/accounting/reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "report.view") && !can(tenant, "accounting.manage")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية عرض التقارير" : "No permission to view reports"}</p>
      </div>
    );
  }

  const [accounts, lineAgg] = await Promise.all([
    prisma.account.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, code: true, name: true, nameAr: true, type: true, parentId: true, openingBalance: true, balance: true },
      orderBy: { code: "asc" },
    }),
    prisma.journalLine.groupBy({
      by: ["accountId"],
      where: { account: { companyId: tenant.companyId } },
      _sum: { debit: true, credit: true },
    }),
  ]);

  const agg = new Map(lineAgg.map((l) => [l.accountId, l._sum]));
  const rows = accounts.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    nameAr: a.nameAr,
    type: a.type,
    parentId: a.parentId,
    opening: b2n(a.openingBalance),
    debits: b2n(agg.get(a.id)?.debit ?? 0n),
    credits: b2n(agg.get(a.id)?.credit ?? 0n),
    closing: b2n(a.balance),
  }));

  const sum = (types: string[]) => rows.filter((r) => types.includes(r.type)).reduce((s, r) => s + r.closing, 0);
  const totals = {
    assets: sum(["ASSET"]),
    liabilities: sum(["LIABILITY"]),
    equity: sum(["EQUITY"]),
    revenue: sum(["REVENUE"]),
    expenses: sum(["EXPENSE"]),
    dr: rows.reduce((s, r) => s + r.debits, 0),
    cr: rows.reduce((s, r) => s + r.credits, 0),
  };

  return (
    <ReportsClient
      lang={lang}
      currency={tenant.currency}
      rows={rows}
      totals={totals}
    />
  );
}