import Link from "next/link";
import { cookies } from "next/headers";
import { TrendingUp, TrendingDown, HandCoins, Landmark, BookOpen, WalletMinimal, NotebookPen } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getAccounts, getExpenses, getJournalEntries, getExpenseCategories, getExpensePayers, getSuppliers, getAccountingStats } from "@/lib/services/accounting";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { AccountsTable, type AccountRow } from "@/features/accounting/accounts-table";
import { AccountForm, type AccountOption } from "@/features/accounting/account-form";
import { ExpensesTable, type ExpenseRow } from "@/features/accounting/expenses-table";
import { ExpenseForm, type CategoryOption, type PayerOption, type SupplierOption } from "@/features/accounting/expense-form";
import { JournalTable, type JournalRow } from "@/features/accounting/journal-table";

export const metadata = { title: "Accounting" };

const dec = (v: { toNumber(): number } | number) =>
  typeof v === "number" ? v : Number(v.toNumber());

export default async function AccountingPage() {
  await requirePermission("accounting");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [accounts, expenses, journalEntries, categories, payers, suppliers, stats] = await Promise.all([
    getAccounts(),
    getExpenses({ limit: 20 }),
    getJournalEntries({ limit: 20 }),
    getExpenseCategories(),
    getExpensePayers(),
    getSuppliers(),
    getAccountingStats(),
  ]);

  const accountRows: AccountRow[] = accounts.map((a) => ({
    id: a.id,
    code: a.code,
    nameAr: a.nameAr,
    nameEn: a.nameEn,
    type: a.type,
    isActive: a.isActive,
    parentCode: a.parent?.code ?? null,
    parentNameAr: a.parent?.nameAr ?? null,
    parentNameEn: a.parent?.nameEn ?? null,
    childrenCount: a._count.children,
  }));

  const expenseRows: ExpenseRow[] = expenses.map((e) => ({
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

  const journalRows: JournalRow[] = journalEntries.map((j) => {
    const debit = j.lines.reduce((s, l) => s + dec(l.debit), 0);
    const credit = j.lines.reduce((s, l) => s + dec(l.credit), 0);
    return {
      id: j.id,
      entryNo: j.entryNo,
      date: j.date.toISOString(),
      description: j.description,
      reference: j.reference,
      totalDebit: debit.toFixed(2),
      totalCredit: credit.toFixed(2),
      linesCount: j.lines.length,
    };
  });

  const accountOptions: AccountOption[] = accounts.map((a) => ({ id: a.id, code: a.code, nameAr: a.nameAr, nameEn: a.nameEn }));
  const categoryOptions: CategoryOption[] = categories.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }));
  const payerOptions: PayerOption[] = payers.map((p) => ({ id: p.id, nameAr: p.nameAr, nameEn: p.nameEn }));
  const supplierOptions: SupplierOption[] = suppliers.map((s) => ({ id: s.id, code: s.code, nameAr: s.nameAr, nameEn: s.nameEn }));

  const fmt = (n: number) =>
    n.toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("accounting.title")}
        description={t("accounting.revenue")}
        icon={<BookOpen />}
        actions={
          <Button asChild size="sm">
            <Link href="/accounting/journal">
              <NotebookPen className="size-4" /> {t("accounting.newEntry")}
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label={t("accounting.revenue")} value={`${fmt(stats.revenue)} YER`} variant="success" />
        <StatCard icon={TrendingDown} label={t("accounting.expenses")} value={`${fmt(stats.expenses)} YER`} variant="danger" />
        <StatCard icon={HandCoins} label={t("accounting.receivables")} value={`${fmt(stats.receivables)} YER`} variant="warning" />
        <StatCard icon={Landmark} label={t("accounting.cashflow")} value={`${fmt(stats.cash)} YER`} variant="primary" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-primary" />
            {t("accounting.chartOfAccounts")} ({accountRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <AccountsTable rows={accountRows} locale={locale} />
            <AccountForm accounts={accountOptions} locale={locale} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletMinimal className="size-4 text-primary" />
            {t("accounting.expenses")} ({expenseRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <ExpensesTable rows={expenseRows} locale={locale} />
            <ExpenseForm categories={categoryOptions} payers={payerOptions} suppliers={supplierOptions} locale={locale} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <NotebookPen className="size-4 text-primary" />
            {t("accounting.journal")} ({journalRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <JournalTable rows={journalRows} locale={locale} />
          <div className="flex justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href="/accounting/journal">
                {t("accounting.journal")} →
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}