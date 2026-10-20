import { cookies } from "next/headers";
import {
  FileBarChart,
  Users,
  CalendarCheck,
  Coins,
  CreditCard,
  AlertTriangle,
  ReceiptText,
  BedDouble,
  TestTube,
  ScanLine,
  Activity,
  LogOut,
} from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import {
  getPatientStatistics,
  getFinancialStatistics,
  getOperationalStatistics,
  getDepartmentPerformance,
  type DateRange,
} from "@/lib/services/reports";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { DateRangeForm } from "@/features/reports/date-range-form";
import { DepartmentTable, type DepartmentRow } from "@/features/reports/reports-tables";

export const metadata = { title: "Reports" };

function parseRange(from?: string, to?: string): DateRange {
  const range: DateRange = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) range.from = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      range.to = d;
    }
  }
  return range;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requirePermission("reports");
  const sp = await searchParams;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const range = parseRange(sp.from, sp.to);
  const [patients, financial, operational, departments] = await Promise.all([
    getPatientStatistics(range),
    getFinancialStatistics(range),
    getOperationalStatistics(range),
    getDepartmentPerformance(),
  ]);

  const money = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const deptRows: DepartmentRow[] = departments;

  return (
    <div className="space-y-5">
      <PageHeader title={t("reports.title")} description={t("reports.filters")} icon={<FileBarChart />} />

      <DateRangeForm from={sp.from} to={sp.to} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("reports.medical")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Users} label={t("reports.patientStatistics")} value={String(patients.newPatients)} variant="info" />
          <StatCard icon={CalendarCheck} label={t("reports.appointmentStatistics")} value={String(operational.appointments)} variant="primary" />
          <StatCard icon={Activity} label={t("reports.departmentPerformance")} value={String(deptRows.reduce((s, d) => s + d.encounters, 0))} variant="default" />
          <StatCard icon={BedDouble} label={t("reports.bedOccupancy")} value={`${operational.occupancyRate}%`} variant="success" />
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("reports.patientStatistics")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {patients.byGender.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("reports.noData")}</p>
            ) : (
              patients.byGender.map((g) => (
                <Badge key={g.gender} variant="secondary">
                  {g.gender}: {g.count}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("reports.financial")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard icon={Coins} label={t("reports.revenue")} value={money(financial.revenue)} variant="success" />
          <StatCard icon={CreditCard} label={t("reports.payments")} value={money(financial.payments)} variant="info" />
          <StatCard icon={AlertTriangle} label={t("reports.outstandingBalances")} value={money(financial.outstanding)} variant="danger" />
          <StatCard icon={ReceiptText} label={t("reports.refunds")} value={money(financial.refunds)} variant="warning" />
          <StatCard icon={FileBarChart} label={t("billing.invoices")} value={String(financial.invoicesCount)} variant="primary" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("reports.operational")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard icon={Activity} label={t("reports.admissions")} value={String(operational.admissions)} variant="info" />
          <StatCard icon={LogOut} label={t("reports.discharges")} value={String(operational.discharges)} variant="default" />
          <StatCard icon={BedDouble} label={t("reports.bedOccupancy")} value={`${operational.occupiedBeds}/${operational.totalBeds}`} variant="primary" />
          <StatCard icon={TestTube} label={t("reports.laboratoryStatistics")} value={String(operational.labOrders)} variant="success" />
          <StatCard icon={ScanLine} label={t("reports.radiologyStatistics")} value={String(operational.radOrders)} variant="warning" />
          <StatCard icon={CalendarCheck} label={t("reports.appointmentStatistics")} value={String(operational.appointments)} variant="info" />
        </div>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("reports.departmentPerformance")}</CardTitle>
        </CardHeader>
        <CardContent>
          {deptRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("reports.noData")}</p>
          ) : (
            <DepartmentTable rows={deptRows} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
