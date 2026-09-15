import Link from "next/link";
import { cookies } from "next/headers";
import {
  Users,
  CalendarClock,
  BedDouble,
  Wallet,
  FlaskConical,
  ScanLine,
  FilePlus2,
  UserPlus,
  Activity,
  UserRound,
  Stethoscope,
} from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getDashboardData } from "@/lib/services/dashboard";
import { formatNumber, formatCurrency, formatTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RevenueTrendChart } from "@/components/charts/revenue-trend-chart";
import { DonutChartWidget } from "@/components/charts/donut-chart";
import { DeptBarChart } from "@/components/charts/dept-bar-chart";
import { initials } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const APPT_STATUS_LABEL_KEYS: Record<string, string> = {
  SCHEDULED: "statusScheduled",
  CONFIRMED: "statusConfirmed",
  ARRIVED: "statusArrived",
  WAITING: "statusWaiting",
  IN_CONSULTATION: "statusInConsultation",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
  NO_SHOW: "statusNoShow",
};

const APPT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "var(--chart-2)",
  CONFIRMED: "var(--chart-1)",
  ARRIVED: "var(--chart-3)",
  WAITING: "var(--chart-4)",
  IN_CONSULTATION: "var(--chart-3)",
  COMPLETED: "var(--chart-1)",
  CANCELLED: "var(--chart-5)",
  NO_SHOW: "var(--chart-5)",
};

const DEPT_LABELS: Record<string, string> = {
  CONSULTATION: "Consultations",
  PROCEDURE: "Procedures",
  LABORATORY: "Laboratory",
  RADIOLOGY: "Radiology",
  PHARMACY: "Pharmacy",
  ROOM: "Inpatient",
  SURGERY: "Surgery",
  ICU: "ICU",
  AMBULANCE: "Ambulance",
  SERVICE: "Services",
  OTHER: "Other",
};

export default async function DashboardPage() {
  const user = await requirePermission("dashboard");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const messages = getMessages(isLocale(localeRaw) ? localeRaw : defaultLocale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };
  const data = await getDashboardData(user.branchId);

  const apptStatusRows = data.todayStatuses
    .map((s) => ({
      name: t(`appointments.${APPT_STATUS_LABEL_KEYS[s.status] ?? "statusScheduled"}`),
      value: s._count._all,
      color: APPT_STATUS_COLORS[s.status] ?? "var(--chart-2)",
      key: s.status,
    }))
    .filter((s) => s.value > 0);

  const bedRows = [
    { name: t("dashboard.availableBeds"), value: data.metrics.availableBeds, color: "var(--chart-1)" },
    { name: t("dashboard.occupiedBeds"), value: data.metrics.occupiedBeds, color: "var(--chart-4)" },
    {
      name: t("common.other"),
      value: data.metrics.cleaningBeds + data.metrics.maintenanceBeds,
      color: "var(--chart-5)",
    },
  ].filter((r) => r.value > 0);

  const deptBar = data.deptRevenue
    .map((d) => ({ name: DEPT_LABELS[d.type] ?? d.type, total: d.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.subtitle")}
        icon={<Activity />}
        actions={
          <Link
            href="/patients/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <UserPlus className="size-4" />
            {t("patients.new")}
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          variant="primary"
          label={t("dashboard.totalPatients")}
          value={formatNumber(data.metrics.totalPatients)}
          hint={`+${formatNumber(data.metrics.todayRegistrations)} ${t("dashboard.todayRegistrations")}`}
        />
        <StatCard
          icon={CalendarClock}
          variant="info"
          label={t("dashboard.todayAppointments")}
          value={formatNumber(data.metrics.todayAppointments)}
          hint={`${formatNumber(data.metrics.cancelledAppointments)} ${t("dashboard.cancelledToday")}`}
        />
        <StatCard
          icon={BedDouble}
          variant="warning"
          label={t("dashboard.admittedPatients")}
          value={formatNumber(data.metrics.admittedCount)}
          hint={`${formatNumber(data.metrics.dischargedToday)} ${t("dashboard.dischargedToday")} · ${data.metrics.icuOccupied}/${data.metrics.icuTotal} ${t("dashboard.icuBeds")}`}
        />
        <StatCard
          icon={Wallet}
          variant="success"
          label={t("dashboard.totalRevenue")}
          value={formatCurrency(data.metrics.totalRevenue)}
          hint={`${t("dashboard.monthlyRevenue")} · ${formatCurrency(data.metrics.monthRevenue)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.revenueTrend")}</CardTitle>
            <CardDescription>{t("dashboard.monthlyRevenue")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueTrendChart data={data.revenueTrend.map((r) => ({ label: r.label, revenue: r.revenue }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.appointmentsByStatus")}</CardTitle>
            <CardDescription>{t("dashboard.todayAppointments")}</CardDescription>
          </CardHeader>
          <CardContent>
            {apptStatusRows.length === 0 ? (
              <p className="py-14 text-center text-sm text-muted-foreground">
                {t("dashboard.noTodaysAppointments")}
              </p>
            ) : (
              <div className="h-56">
                <DonutChartWidget
                  data={apptStatusRows}
                  centerLabel={String(data.metrics.todayAppointments)}
                  centerSub={t("dashboard.todayAppointments")}
                />
              </div>
            )}
            {apptStatusRows.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {apptStatusRows.map((s) => (
                  <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.bedOccupancy")}</CardTitle>
            <CardDescription>{t("dashboard.wardsOccupancy")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <DonutChartWidget
                data={bedRows}
                centerLabel={`${Math.round((data.metrics.occupiedBeds / Math.max(1, data.metrics.occupiedBeds + data.metrics.availableBeds)) * 100)}%`}
                centerSub={t("dashboard.occupiedBeds")}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {bedRows.map((s) => (
                <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                  {s.name} · {formatNumber(s.value)}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.departmentPerformance")}</CardTitle>
            <CardDescription>{t("dashboard.revenueByDepartment")}</CardDescription>
          </CardHeader>
          <CardContent>
            {deptBar.length === 0 ? (
              <p className="py-14 text-center text-sm text-muted-foreground">
                {t("billing.noInvoices")}
              </p>
            ) : (
              <DeptBarChart data={deptBar} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.staffSummary")}</CardTitle>
            <CardDescription>{t("dashboard.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-md bg-primary/12 text-primary">
                  <UserRound className="size-4.5" />
                </span>
                <span className="text-sm font-medium">{t("dashboard.cardDoctors")}</span>
              </div>
              <span className="text-xl font-semibold tabular-nums">{data.metrics.doctors}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-md bg-success/12 text-success">
                  <Stethoscope className="size-4.5" />
                </span>
                <span className="text-sm font-medium">{t("dashboard.cardNurses")}</span>
              </div>
              <span className="text-xl font-semibold tabular-nums">{data.metrics.nurses}</span>
            </div>
            <div className="mt-1 flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-md bg-warning/12 text-warning">
                  <FlaskConical className="size-4.5" />
                </span>
                <span className="text-sm font-medium">{t("dashboard.labOrdersToday")}</span>
              </div>
              <span className="text-xl font-semibold tabular-nums">{data.metrics.labOrdersToday}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-md bg-info/12 text-info">
                  <ScanLine className="size-4.5" />
                </span>
                <span className="text-sm font-medium">{t("dashboard.radOrdersToday")}</span>
              </div>
              <span className="text-xl font-semibold tabular-nums">{data.metrics.radOrdersToday}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-md bg-destructive/12 text-destructive">
                  <FilePlus2 className="size-4.5" />
                </span>
                <span className="text-sm font-medium">{t("dashboard.rxToday")}</span>
              </div>
              <span className="text-xl font-semibold tabular-nums">{data.metrics.prescriptionsToday}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.todaysSchedule")}</CardTitle>
            <CardDescription>{t("dashboard.todayAppointments")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.todaySchedule.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t("dashboard.noTodaysAppointments")}
              </p>
            ) : (
              <ul className="divide-y">
                {data.todaySchedule.map((a) => {
                  const statusKey = APPT_STATUS_LABEL_KEYS[a.status] ?? "statusScheduled";
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex h-10 w-13 shrink-0 items-center justify-center rounded-md border bg-muted/40 px-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatTime(a.scheduledAt)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/patients/${a.patientId}`}
                          className="block truncate text-sm font-medium hover:text-primary"
                        >
                          {a.patient.nameAr || a.patient.nameEn || "—"}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.doctor
                            ? `${a.doctor.nameEn || a.doctor.nameAr || ""}${a.doctor.specialty ? ` · ${a.doctor.specialty.nameEn}` : ""}`
                            : ""}
                        </p>
                      </div>
                      <Badge variant="outline">{t(`appointments.${statusKey}`)}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.recentPatients")}</CardTitle>
            <CardDescription>{t("dashboard.totalPatients")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentPatients.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t("patients.noPatientsYet")}
              </p>
            ) : (
              <ul className="divide-y">
                {data.recentPatients.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/patients/${p.id}`}
                      className="flex items-center gap-3 rounded-md px-1 py-2 transition-colors hover:bg-accent/60"
                    >
                      <Avatar className="size-9">
                        <AvatarFallback>{initials(p.nameEn || p.nameAr || "")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.nameAr || p.nameEn || "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.mrn ?? ""}</p>
                      </div>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {t("common.today_no")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}