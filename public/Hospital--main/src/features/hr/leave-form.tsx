"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { createLeaveRequestAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmployeeOption = { id: string; employeeNo: string; nameAr: string; nameEn: string };

const LEAVE_TYPES = ["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PILGRIMAGE", "OTHER"] as const;

const LEAVE_TYPE_KEY: Record<string, string> = {
  ANNUAL: "hr.typeAnnual",
  SICK: "hr.typeSick",
  UNPAID: "hr.typeUnpaid",
  MATERNITY: "hr.typeMaternity",
  PILGRIMAGE: "hr.typePilgrimage",
  OTHER: "hr.typeOther",
};

type State = { ok: boolean; error?: string } | null;

export function LeaveForm({ locale, employees }: { locale: string; employees: EmployeeOption[] }) {
  const t = useTranslations();
  const tc = useTranslations("common");
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await createLeaveRequestAction(null, formData);
      if (res?.ok) {
        toast.success(tc("saved"));
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
          <CalendarPlus className="size-4 text-primary" />
          {t("hr.newLeave")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="leaveType" value={leaveType} />
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
          <div className="space-y-1.5">
            <Label className="text-xs">{t("hr.leaveType")}</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue>{t(LEAVE_TYPE_KEY[leaveType])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((lt) => (
                  <SelectItem key={lt} value={lt}>
                    {t(LEAVE_TYPE_KEY[lt])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("hr.startDate")} *</Label>
              <Input name="startDate" type="date" required className="h-8 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("hr.endDate")} *</Label>
              <Input name="endDate" type="date" required className="h-8 text-sm" dir="ltr" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("notes")}</Label>
            <Textarea name="reason" rows={2} className="text-sm" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : tc("error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? tc("saving") : t("hr.newLeave")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}