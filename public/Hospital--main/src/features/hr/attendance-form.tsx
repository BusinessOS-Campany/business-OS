"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { markAttendanceAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmployeeOption = { id: string; employeeNo: string; nameAr: string; nameEn: string };

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE", "OVERTIME"] as const;

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "hr.present",
  ABSENT: "hr.absent",
  LATE: "hr.late",
  LEAVE: "hr.leave",
  OVERTIME: "payroll.overtime",
};

type State = { ok: boolean; error?: string } | null;

export function AttendanceForm({
  locale,
  employees,
}: {
  locale: string;
  employees: EmployeeOption[];
}) {
  const t = useTranslations();
  const tc = useTranslations("common");
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState("PRESENT");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await markAttendanceAction(null, formData);
      if (res?.ok) {
        toast.success(res.message && res.message.startsWith("hr.") ? t(res.message) : tc("saved"));
        router.refresh();
        return { ok: true };
      }
      return { ok: false, error: res?.error };
    },
    null
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="size-4 text-primary" />
          {t("hr.attendance")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="status" value={status} />
          <div className="space-y-1.5">
            <Label className="text-xs">{t("employees.title")} *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {locale === "ar" ? e.nameAr : e.nameEn} ({e.employeeNo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("date")} *</Label>
              <Input name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="h-8 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue>{t(STATUS_LABEL[status])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {t(STATUS_LABEL[st])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("time")} In</Label>
              <Input name="checkIn" type="time" className="h-8 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("time")} Out</Label>
              <Input name="checkOut" type="time" className="h-8 text-sm" dir="ltr" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("notes")}</Label>
            <Input name="note" className="h-8 text-sm" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : tc("error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? tc("saving") : tc("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}