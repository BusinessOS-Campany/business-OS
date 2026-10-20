import { prisma } from "@/lib/prisma";
import { getTenant, can } from "@/server/session";
import { fromMinor } from "@/lib/money";
import { ExpensesClient } from "@/components/expenses/expenses-client";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const tenant = await getTenant();
  const lang: "ar" | "en" = tenant.user.language === "ar" ? "ar" : "en";

  if (!can(tenant, "expense.manage")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{lang === "ar" ? "ليست لديك صلاحية المصاريف" : "No permission to manage expenses"}</p>
      </div>
    );
  }

  const [expenses, categories, branches, methods] = await Promise.all([
    prisma.expense.findMany({
      where: { companyId: tenant.companyId },
      select: {
        id: true, expenseNo: true, amount: true, date: true, description: true,
        status: true, methodNameAr: true, methodNameEn: true, methodType: true,
        category: { select: { name: true, nameAr: true } },
        branch: { select: { name: true, nameAr: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        approvedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.expenseCategory.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, name: true, nameAr: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { companyId: tenant.companyId },
      select: { id: true, name: true, nameAr: true },
    }),
    prisma.paymentMethod.findMany({
      where: { companyId: tenant.companyId, isActive: true },
      select: { id: true, nameAr: true, nameEn: true, type: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <ExpensesClient
      lang={lang}
      expenses={expenses.map((e) => ({
        id: e.id, expenseNo: e.expenseNo, amount: fromMinor(Number(e.amount)), date: e.date.toISOString(),
        description: e.description, status: e.status,
        methodName: lang === "ar" ? e.methodNameAr || e.methodNameEn : e.methodNameEn || e.methodNameAr,
        methodType: e.methodType, categoryName: lang === "ar" ? e.category.nameAr || e.category.name : e.category.name,
        branchName: lang === "ar" ? e.branch.nameAr || e.branch.name : e.branch.name,
        createdByName: e.createdBy?.name ?? "", approvedByName: e.approvedBy?.name ?? "",
        approvedAt: e.approvedAt?.toISOString() ?? null,
      }))}
      categories={categories.map((c) => ({ id: c.id, name: lang === "ar" ? c.nameAr || c.name : c.name }))}
      branches={branches.map((b) => ({ id: b.id, name: lang === "ar" ? b.nameAr || b.name : b.name }))}
      methods={methods.map((m) => ({ id: m.id, name: lang === "ar" ? m.nameAr || m.nameEn : m.nameEn || m.nameAr, type: m.type }))}
    />
  );
}