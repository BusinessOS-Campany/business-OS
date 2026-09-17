import Link from "next/link";
import { cookies } from "next/headers";
import { NotebookPen, ArrowLeft } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getJournalEntries, getAccounts } from "@/lib/services/accounting";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JournalTable, type JournalRow } from "@/features/accounting/journal-table";
import { JournalForm, type AccountOption } from "@/features/accounting/journal-form";

export const metadata = { title: "Journal Entries" };

const dec = (v: { toNumber(): number } | number) =>
  typeof v === "number" ? v : Number(v.toNumber());

export default async function JournalPage() {
  await requirePermission("accounting");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [entries, accounts] = await Promise.all([getJournalEntries({ limit: 100 }), getAccounts()]);

  const rows: JournalRow[] = entries.map((j) => {
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("accounting.journal")}
        description={t("accounting.newEntry")}
        icon={<NotebookPen />}
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
            <JournalTable rows={rows} locale={locale} />
          </CardContent>
        </Card>
        <JournalForm accounts={accountOptions} locale={locale} />
      </div>
    </div>
  );
}