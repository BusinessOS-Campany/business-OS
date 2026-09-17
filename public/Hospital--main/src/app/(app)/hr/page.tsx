import { cookies } from "next/headers";
import { Users, CheckCircle2, UserX, Clock, CalendarClock } from "lucide-react";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import {
  getAttendance,
  getShifts,
  getEmployeeShifts,
  getLeaveRequests,
  getHrStats,
  getHrEmployees,
} from "@/lib/services/hr";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { AttendanceForm } from "@/features/hr/attendance-form";
import { AttendanceTable, type AttendanceRow } from "@/features/hr/attendance-table";
import { LeaveForm } from "@/features/hr/leave-form";
import { LeaveTable, type LeaveRow } from "@/features/hr/leave-table";
import { ShiftForm } from "@/features/hr/shift-form";
import { ShiftAssignForm } from "@/features/hr/shift-assign-form";
import { ShiftsTable, type ShiftRow } from "@/features/hr/shifts-table";

export const metadata = { title: "HR & Attendance" };

function parseDay(s: string | undefined): Date {
  if (!s) return new Date();
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function HrPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  await requirePermission("hr");
  const { d } = await searchParams;
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return typeof value === "string" ? value : key;
  };

  const day = parseDay(d);
  const today = toDay(day);

  const [attendance, shifts, employeeShifts, leaves, stats, employees] = await Promise.all([
    getAttendance({ date: today, limit: 100 }),
    getShifts(),
    getEmployeeShifts({ limit: 100 }),
    getLeaveRequests({ limit: 100 }),
    getHrStats(day),
    getHrEmployees(),
  ]);

  const attendanceRows: AttendanceRow[] = attendance.map((a) => ({
    id: a.id,
    employeeNameAr: a.employee.nameAr,
    employeeNameEn: a.employee.nameEn,
    employeeNo: a.employee.employeeNo,
    date: toDay(a.date),
    checkIn: a.checkIn ? a.checkIn.toISOString() : null,
    checkOut: a.checkOut ? a.checkOut.toISOString() : null,
    status: a.status,
  }));

  const leaveRows: LeaveRow[] = leaves.map((l) => ({
    id: l.id,
    employeeNameAr: l.employee.nameAr,
    employeeNameEn: l.employee.nameEn,
    employeeNo: l.employee.employeeNo,
    leaveType: l.leaveType,
    startDate: toDay(l.startDate),
    endDate: toDay(l.endDate),
    days: l.days,
    reason: l.reason,
    status: l.status,
  }));

  const shiftRows: ShiftRow[] = employeeShifts.map((es) => ({
    id: es.id,
    employeeNameAr: es.employee.nameAr,
    employeeNameEn: es.employee.nameEn,
    employeeNo: es.employee.employeeNo,
    shiftNameAr: es.shift.nameAr,
    shiftNameEn: es.shift.nameEn,
    startTime: es.shift.startTime,
    endTime: es.shift.endTime,
    date: toDay(es.date),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("hr.title")}
        description={t("hr.title")}
        icon={<Users />}
        actions={
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-4" />
            {new Date(`${today}T00:00:00`).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label={t("hr.present")} value={String(stats.present)} variant="success" />
        <StatCard icon={UserX} label={t("hr.absent")} value={String(stats.absent)} variant="danger" />
        <StatCard icon={Clock} label={t("hr.late")} value={String(stats.late)} variant="warning" />
        <StatCard icon={CalendarClock} label={t("hr.leave")} value={String(stats.pendingLeaves)} variant="info" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("hr.attendance")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <AttendanceForm locale={locale} employees={employees} />
          </div>
          <div className="lg:col-span-2">
            {attendanceRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("hr.present")}</p>
            ) : (
              <AttendanceTable rows={attendanceRows} locale={locale} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("hr.leave")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <LeaveForm locale={locale} employees={employees} />
          </div>
          <div className="lg:col-span-2">
            {leaveRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("hr.statusPending")}</p>
            ) : (
              <LeaveTable rows={leaveRows} locale={locale} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("hr.shifts")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-1">
            <ShiftForm />
            <ShiftAssignForm locale={locale} employees={employees} shifts={shifts} />
          </div>
          <div className="lg:col-span-2">
            {shiftRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("hr.shifts")}</p>
            ) : (
              <ShiftsTable rows={shiftRows} locale={locale} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}