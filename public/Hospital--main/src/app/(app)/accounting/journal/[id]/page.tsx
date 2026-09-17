import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { NotebookPen, ArrowLeft, Hash } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getJournalEntryById } from "@/lib/services/accounting";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, type Crumb } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Journal Entry" };

const dec = (v: { toNumber(): number } | number) =>
  typeof v === "number" ? v : Number(v.toNumber());

export default async function JournalEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("accounting");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const entry = await getJournalEntryById(id);
  if (!entry) notFound();

  const totalDebit = entry.lines.reduce((s, l) => s + dec(l.debit), 0);
  const totalCredit = entry.lines.reduce((s, l) => s + dec(l.credit), 0);
  const fmt = (n: number) =>
    n.toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 2 });

  const breadcrumbs: Crumb[] = [
    { label: t("accounting.title"), href: "/accounting" },
    { label: t("accounting.journal"), href: "/accounting/journal" },
    { label: entry.entryNo },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={entry.entryNo}
        description={formatDateTime(entry.date, locale)}
        icon={<NotebookPen />}
        breadcrumbs={breadcrumbs}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/accounting/journal">
              <ArrowLeft className="size-4" /> {t("accounting.journal")}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Hash className="size-3.5" /> {t("common.description") ?? "Description"}
              </p>
              <p className="text-sm font-medium">{entry.description ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("payments.reference") ?? "Reference"}</p>
              <p className="text-sm font-medium">{entry.reference ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("accounting.debit")}</p>
              <p className="text-sm font-medium tabular-nums">{fmt(totalDebit)} YER</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("accounting.credit")}</p>
              <p className="text-sm font-medium tabular-nums">{fmt(totalCredit)} YER</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="py-2 pl-4 pr-3 text-start">{t("accounting.account")}</th>
                  <th className="py-2 pr-3 text-end">{t("accounting.debit")}</th>
                  <th className="py-2 pr-4 text-end">{t("accounting.credit")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entry.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 pl-4 pr-3">
                      <p className="font-medium">{locale === "ar" ? l.account.nameAr : l.account.nameEn}</p>
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">{l.account.code}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-end tabular-nums">
                      {dec(l.debit) > 0 ? fmt(dec(l.debit)) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-end tabular-nums">
                      {dec(l.credit) > 0 ? fmt(dec(l.credit)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/20 text-sm font-semibold">
                <tr>
                  <td className="py-2 pl-4 pr-3">{t("accounting.balance")}</td>
                  <td className="py-2 pr-3 text-end tabular-nums">{fmt(totalDebit)}</td>
                  <td className="py-2 pr-4 text-end tabular-nums">{fmt(totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}