"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, CalendarPlus2, SearchIcon, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAppointmentAction } from "@/actions/appointments";
import { toast } from "sonner";

interface Person {
  id: string;
  nameAr: string;
  nameEn: string;
  mrn?: string;
  phone?: string | null;
}

interface Datum {
  id: string;
  nameAr: string;
  nameEn: string;
  specialty?: { id: string; nameAr: string; nameEn: string } | null;
  department?: { id: string; nameAr: string; nameEn: string } | null;
}

const TYPES = [
  { value: "OUTPATIENT", key: "typeOutpatient" },
  { value: "FOLLOW_UP", key: "typeFollowUp" },
  { value: "EMERGENCY", key: "typeEmergency" },
  { value: "PROCEDURE", key: "typeProcedure" },
  { value: "INPATIENT", key: "typeInpatient" },
] as const;

const PRIORITIES = [
  { value: "ROUTINE", key: "priorityRoutine" },
  { value: "URGENT", key: "priorityUrgent" },
  { value: "EMERGENCY", key: "priorityEmergency" },
  { value: "STAT", key: "priorityStat" },
] as const;

export function AppointmentForm({
  patients,
  doctors,
  departments,
  locale,
}: {
  patients: Person[];
  doctors: Datum[];
  departments: Datum[];
  locale: string;
}) {
  const t = useTranslations("appointments");
  const tc = useTranslations("common");
  const router = useRouter();

  const [state, action, pending] = useActionState(createAppointmentAction, null);
  const [isPending, startTransition] = useTransition();

  const [patientId, setPatientId] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [doctorId, setDoctorId] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [appointmentType, setAppointmentType] = React.useState("OUTPATIENT");
  const [priority, setPriority] = React.useState("ROUTINE");
  const [duration, setDuration] = React.useState("15");

  const nameOf = (p: { nameAr: string; nameEn: string }) => (locale === "ar" ? p.nameAr : p.nameEn);

  const selectedPatient = patients.find((p) => p.id === patientId);

  const filtered = query.trim()
    ? patients.filter((p) =>
        [p.nameAr, p.nameEn, p.mrn ?? "", p.phone ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : patients;

  React.useEffect(() => {
    if (state?.ok && state.data?.id) {
      toast.success(t("createdTitle") + " ✓");
      router.push(`/appointments/${state.data.id}`);
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(t("conflict"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  const busy = pending || isPending;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="doctorId" value={doctorId} />
      <input type="hidden" name="departmentId" value={departmentId} />
      <input type="hidden" name="appointmentType" value={appointmentType} />
      <input type="hidden" name="priority" value={priority} />
      <input type="hidden" name="durationMinutes" value={duration} />

      <section className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>{t("selectPatient")}</Label>
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-2.5" />
              <Input
                value={selectedPatient ? nameOf(selectedPatient) : query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPickerOpen(true);
                  setPatientId("");
                }}
                onFocus={() => setPickerOpen(true)}
                onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
                placeholder={t("searchPatient")}
                className="pl-8 rtl:pl-3 rtl:pr-8"
              />
              {pickerOpen && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {tc("noResults")}
                    </p>
                  ) : (
                    filtered.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent rtl:text-right"
                        onMouseDown={() => {
                          setPatientId(p.id);
                          setQuery("");
                          setPickerOpen(false);
                        }}
                      >
                        <UserRound className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {nameOf(p)}
                          {p.mrn ? <span className="ms-1 text-xs text-muted-foreground">· {p.mrn}</span> : null}
                        </span>
                        {p.phone ? (
                          <span dir="ltr" className="text-xs text-muted-foreground tabular-nums">
                            {p.phone}
                          </span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("bookedFor")}</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectDoctor")} />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {nameOf(d)}
                    {d.specialty ? ` · ${nameOf(d.specialty)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("departmentLabel")}</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectDepartment")} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {nameOf(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="scheduledAt">{t("scheduledAt")}</Label>
            <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label>{t("duration")}</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-full">
                  <SelectValue>{duration}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {["15", "30", "45", "60", "90", "120"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m} {t("minutes")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("type")}</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger className="w-full">
                  <SelectValue>{t(TYPES.find((tp) => tp.value === appointmentType)!.key)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((tp) => (
                    <SelectItem key={tp.value} value={tp.value}>
                      {t(tp.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("priority")}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full">
                  <SelectValue>{t(PRIORITIES.find((p) => p.value === priority)!.key)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {t(p.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="reason">{t("reason")}</Label>
            <Textarea id="reason" name="reason" rows={2} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="notes">{tc("notes")}</Label>
            <Input id="notes" name="notes" />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={busy || !patientId} className="gap-2">
          {busy ? <Loader2Icon className="size-4 animate-spin" /> : <CalendarPlus2 className="size-4" />}
          {busy ? tc("saving") : t("new")}
        </Button>
      </div>
    </form>
  );
}