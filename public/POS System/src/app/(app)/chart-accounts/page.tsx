import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { b2n } from "@/lib/format";
import { ChartClient } from "@/components/accounting/chart-client";

export const dynamic = "force-dynamic";

export default async function ChartAccountsPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "accounting.manage") && !can(tenant, "report.view")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية عرض الحسابات" : "No permission to view accounts"}</p>
      </div>
    );
  }

  const accounts = await prisma.account.findMany({
    where: { companyId: tenant.companyId },
    select: {
      id: true, code: true, name: true, nameAr: true, type: true,
      isSystem: true, isActive: true, parentId: true,
      openingBalance: true, balance: true, createdAt: true,
      _count: { select: { children: true, lines: true } },
    },
    orderBy: { code: "asc" },
  });

  return (
    <ChartClient
      lang={lang}
      currency={tenant.currency}
      canManage={can(tenant, "accounting.manage")}
      accounts={accounts.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        nameAr: a.nameAr,
        type: a.type,
        isSystem: a.isSystem,
        isActive: a.isActive,
        parentId: a.parentId,
        openingBalance: b2n(a.openingBalance),
        balance: b2n(a.balance),
        childCount: a._count.children,
        lineCount: a._count.lines,
      }))}
    />
  );
}