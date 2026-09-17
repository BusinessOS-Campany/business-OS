import Link from "next/link";
import { cookies } from "next/headers";
import { WalletMinimal, ArrowLeft } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getExpenses, getExpenseCategories, getExpensePayers, getSuppliers } from "@/lib/services/accounting";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExpensesTable, type ExpenseRow } from "@/features/accounting/expenses-table";
import { ExpenseForm, type CategoryOption, type PayerOption, type SupplierOption } from "@/features/accounting/expense-form";

export const metadata = { title: "Expenses" };

const dec = (v: { toNumber(): number } | number) =>
  typeof v === "number" ? v : Number(v.toNumber());

export default async function ExpensesPage() {
  await requirePermission("expenses");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [expenses, categories, payers, suppliers] = await Promise.all([
    getExpenses({ limit: 100 }),
    getExpenseCategories(),
    getExpensePayers(),
    getSuppliers(),
  ]);

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    expenseNo: e.expenseNo,
    categoryId: e.category.id,
    categoryAr: e.category.nameAr,
    categoryEn: e.category.nameEn,
    amount: dec(e.amount).toFixed(2),
    method: e.method,
    paidByAr: e.paidBy?.nameAr ?? null,
    paidByEn: e.paidBy?.nameEn ?? null,
    paidAt: e.paidAt.toISOString(),
  }));

  const categoryOptions: CategoryOption[] = categories.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }));
  const payerOptions: PayerOption[] = payers.map((p) => ({ id: p.id, nameAr: p.nameAr, nameEn: p.nameEn }));
  const supplierOptions: SupplierOption[] = suppliers.map((s) => ({ id: s.id, code: s.code, nameAr: s.nameAr, nameEn: s.nameEn }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("accounting.expenses")}
        description={t("accounting.newExpense")}
        icon={<WalletMinimal />}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/accounting">
              <ArrowLeft className="size-4" /> {t("accounting.title")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardContent className="pt-6">
            <ExpensesTable rows={rows} locale={locale} />
          </CardContent>
        </Card>
        <ExpenseForm categories={categoryOptions} payers={payerOptions} suppliers={supplierOptions} locale={locale} />
      </div>
    </div>
  );
}