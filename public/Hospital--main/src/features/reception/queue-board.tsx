"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Volume2Icon,
  CheckCircle2Icon,
  UserRoundCheckIcon,
  UserRoundXIcon,
  BanIcon,
  Clock3Icon,
  CalendarClockIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { initials } from "@/lib/utils";
import { callQueueTicketAction, setAppointmentStatusAction } from "@/actions/appointments";
import type { QueueBoardItem } from "@/lib/services/reception";

type AppointmentRow = {
  id: string;
  appointmentNo: string;
  scheduledAt: string;
  status: string;
  patient: { id: string; mrn: string; nameAr: string; nameEn: string };
  doctor?: { id: string; nameAr: string; nameEn: string } | null;
  queueTicket?: { id: string; ticketNo: string; status: string } | null;
};

const PRIORITY_KEY: Record<string, string> = {
  ROUTINE: "priorityRoutine",
  URGENT: "priorityUrgent",
  EMERGENCY: "priorityEmergency",
  STAT: "priorityStat",
};

const APPT_STATUS_KEY: Record<string, string> = {
  SCHEDULED: "statusScheduled",
  CONFIRMED: "statusConfirmed",
  ARRIVED: "statusArrived",
  WAITING: "statusWaiting",
  IN_CONSULTATION: "statusInConsultation",
  COMPLETED: "statusCompleted",
  NO_SHOW: "statusNoShow",
};

export function QueueBoard({
  nowServing,
  waiting,
  appointments,
  locale,
}: {
  nowServing: QueueBoardItem | null;
  waiting: QueueBoardItem[];
  appointments: AppointmentRow[];
  locale: string;
}) {
  const t = useTranslations("reception");
  const ta = useTranslations("appointments");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const callTicket = (id: string, status: "CALLED" | "IN_SERVICE" | "COMPLETED" | "NO_SHOW" | "CANCELLED") => {
    startTransition(async () => {
      const res = await callQueueTicketAction(id, status, null);
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(tc("error"));
      }
    });
  };

  const setAppt = (id: string, status: string) => {
    startTransition(async () => {
      const res = await setAppointmentStatusAction(id, status, null);
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(tc("error"));
      }
    });
  };

  const nameOf = (p: { nameAr: string; nameEn: string }) => (locale === "ar" ? p.nameAr : p.nameEn);
  const timeOf = (iso: string) =>
    locale === "ar"
      ? new Date(iso).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })
      : new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const activeAppointments = appointments.filter(
    (a) => !["COMPLETED", "NO_SHOW", "CANCELLED"].includes(a.status)
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2Icon className="size-4 text-primary" />
            {t("currentNumber")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {nowServing ? (
            <div className="rounded-xl border-2 border-primary/60 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-4xl font-bold tracking-tight tabular-nums">
                  {nowServing.ticketNo}
                </p>
                <Badge variant={nowServing.status === "IN_SERVICE" ? "success" : "warning"}>
                  {nowServing.status === "IN_SERVICE" ? t("markServed") : t("call")}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-2.5">
                <Avatar className="size-8">
                  <AvatarFallback>{initials(nameOf(nowServing.patient))}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <Link
                    href={`/patients/${nowServing.patient.id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {nameOf(nowServing.patient)}
                  </Link>
                  <p className="text-xs text-muted-foreground tabular-nums">{nowServing.patient.mrn}</p>
                </div>
              </div>
              {nowServing.department ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {locale === "ar" ? nowServing.department.nameAr : nowServing.department.nameEn}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("noPatientsWaiting")}
            </div>
          )}
          {nowServing && nowServing.status !== "IN_SERVICE" ? (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gap-1.5" disabled={isPending} onClick={() => callTicket(nowServing.id, "IN_SERVICE")}>
                <UserRoundCheckIcon className="size-3.5" />
                {t("markServed")}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" disabled={isPending} onClick={() => callTicket(nowServing.id, "COMPLETED")}>
                <CheckCircle2Icon className="size-3.5" />
                {t("complete")}
              </Button>
              <Button size="sm" variant="destructive" className="gap-1.5" disabled={isPending} onClick={() => callTicket(nowServing.id, "CANCELLED")}>
                <BanIcon className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock3Icon className="size-4 text-primary" />
            {t("queue")} · {waiting.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waiting.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("noPatientsWaiting")}
            </div>
          ) : (
            <ul className="divide-y">
              {waiting.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <span className="font-mono text-sm font-semibold tabular-nums">{item.ticketNo}</span>
                  <Badge variant="muted">{ta(PRIORITY_KEY[item.priority] ?? "priorityRoutine")}</Badge>
                  <div className="min-w-0 flex-1">
                    <Link href={`/patients/${item.patient.id}`} className="truncate text-sm font-medium hover:underline">
                      {nameOf(item.patient)}
                    </Link>
                    {item.department ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {locale === "ar" ? item.department.nameAr : item.department.nameEn}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {timeOf(item.createdAt.toISOString())}
                  </span>
                  <Button size="sm" variant="secondary" className="gap-1.5" disabled={isPending} onClick={() => callTicket(item.id, "CALLED")}>
                    <Volume2Icon className="size-3.5" />
                    {t("call")}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={isPending} onClick={() => callTicket(item.id, "NO_SHOW")}>
                    <UserRoundXIcon className="size-3.5" />
                    {ta("noShow")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClockIcon className="size-4 text-primary" />
            {ta("day")} · {activeAppointments.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {ta("noneScheduled")}
            </div>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-150 text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground rtl:text-right">
                    <th className="py-2 pr-3 font-medium">{tc("time")}</th>
                    <th className="py-2 pr-3 font-medium">{ta("bookedFor")}</th>
                    <th className="py-2 pr-3 font-medium">{ta("doctorLabel")}</th>
                    <th className="py-2 pr-3 font-medium">{ta("queueTicket")}</th>
                    <th className="py-2 pr-3 font-medium">{ta("status")}</th>
                    <th className="py-2 pr-3 text-right font-medium rtl:text-left">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeAppointments.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{timeOf(a.scheduledAt)}</td>
                      <td className="py-2 pr-3">
                        <Link href={`/patients/${a.patient.id}`} className="flex items-center gap-2.5">
                          <Avatar className="size-7">
                            <AvatarFallback className="text-[10px]">{initials(nameOf(a.patient))}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{nameOf(a.patient)}</p>
                            <p className="truncate text-xs text-muted-foreground tabular-nums">{a.patient.mrn}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {a.doctor ? nameOf(a.doctor) : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {a.queueTicket ? (
                          <span className="font-mono text-xs tabular-nums">{a.queueTicket.ticketNo}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{ta("noQueueTicket")}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={a.status === "ARRIVED" || a.status === "WAITING" ? "default" : "secondary"}>
                          {ta(APPT_STATUS_KEY[a.status] ?? "statusScheduled")}
                        </Badge>
                      </td>
                      <td className="py-2 text-right rtl:text-left">
                        <div className="flex justify-end gap-1.5">
                          {a.status === "SCHEDULED" || a.status === "CONFIRMED" ? (
                            <Button size="sm" className="gap-1.5" disabled={isPending} onClick={() => setAppt(a.id, "ARRIVED")}>
                              <UserRoundCheckIcon className="size-3.5" />
                              {ta("checkIn")}
                            </Button>
                          ) : null}
                          {a.status === "ARRIVED" ? (
                            <Button size="sm" variant="secondary" disabled={isPending} onClick={() => setAppt(a.id, "WAITING")}>
                              {ta("statusArrived")} →
                            </Button>
                          ) : null}
                          {(a.status === "SCHEDULED" || a.status === "CONFIRMED" || a.status === "ARRIVED" || a.status === "WAITING") ? (
                            <Button size="sm" variant="destructive" disabled={isPending} onClick={() => setAppt(a.id, a.status === "ARRIVED" ? "NO_SHOW" : "CANCELLED")}>
                              {a.status === "ARRIVED" ? ta("noShow") : tc("cancel")}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}