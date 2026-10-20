"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { assignShiftAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmployeeOption = { id: string; employeeNo: string; nameAr: string; nameEn: string };
type ShiftOption = { id: string; nameAr: string; nameEn: string };

type State = { ok: boolean; error?: string } | null;

export function ShiftAssignForm({
  locale,
  employees,
  shifts,
}: {
  locale: string;
  employees: EmployeeOption[];
  shifts: ShiftOption[];
}) {
  const t = useTranslations();
  const tc = useTranslations("common");
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await assignShiftAction(null, formData);
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
          <CalendarClock className="size-4 text-primary" />
          {t("hr.shifts")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="shiftId" value={shiftId} />
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
            <Label className="text-xs">{t("hr.shifts")} *</Label>
            <Select value={shiftId} onValueChange={setShiftId}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {locale === "ar" ? s.nameAr : s.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("date")} *</Label>
            <Input name="date" type="date" required className="h-8 text-sm" dir="ltr" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : tc("error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? tc("saving") : t("common.add")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}