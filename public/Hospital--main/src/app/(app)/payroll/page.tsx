import { cookies } from "next/headers";
import { Wallet, CalendarClock, CheckCircle2, Banknote, Coins } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getPayrollPeriods, getPayrollStats } from "@/lib/services/payroll";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PeriodForm } from "@/features/payroll/period-form";
import { PeriodsTable, type PeriodRow } from "@/features/payroll/periods-table";

export const metadata = { title: "Payroll" };

export default async function PayrollPage() {
  await requirePermission("payroll");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const [periods, stats] = await Promise.all([getPayrollPeriods({ limit: 50 }), getPayrollStats()]);

  const rows: PeriodRow[] = periods.map((p) => ({
    id: p.id,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    startDate: p.startDate.toISOString().slice(0, 10),
    endDate: p.endDate.toISOString().slice(0, 10),
    status: p.status,
    runsCount: p.runs.length,
  }));

  return (
    <div className="space-y-5">
      <PageHeader title={t("payroll.title")} description={t("payroll.periods")} icon={<Wallet />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Wallet} label={t("payroll.periods")} value={String(stats.periods)} variant="primary" />
        <StatCard icon={CalendarClock} label={t("payroll.statusDraft")} value={String(stats.draft)} variant="warning" />
        <StatCard icon={CheckCircle2} label={t("payroll.statusApproved")} value={String(stats.approved)} variant="info" />
        <StatCard icon={Banknote} label={t("payroll.statusPaid")} value={String(stats.paid)} variant="success" />
        <StatCard
          icon={Coins}
          label={t("payroll.net")}
          value={stats.totalPaid.toLocaleString()}
          variant="default"
        />
      </div>

      <PeriodForm />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4 text-primary" />
            {t("payroll.periods")} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("payroll.noPeriods")}</p>
          ) : (
            <PeriodsTable rows={rows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
