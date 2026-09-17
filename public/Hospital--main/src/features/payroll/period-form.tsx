"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { createPayrollPeriodAction } from "@/actions/payroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type State = { ok: boolean; error?: string } | null;

export function PeriodForm() {
  const t = useTranslations();
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(async (_: State, formData: FormData) => {
    const res = await createPayrollPeriodAction(null, formData);
    if (res?.ok) {
      toast.success(t("payroll.title"));
      router.refresh();
      return { ok: true };
    }
    return { ok: false, error: res?.error };
  }, null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarPlus className="size-4 text-primary" />
          {t("payroll.newPeriod")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("common.name")} (EN)</Label>
            <Input name="nameEn" required className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("common.name")} (AR)</Label>
            <Input name="nameAr" required dir="rtl" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("hr.startDate")}</Label>
            <Input name="startDate" type="date" required className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("hr.endDate")}</Label>
            <Input name="endDate" type="date" required className="h-8 text-sm" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive sm:col-span-2">
              {state.error ? t(state.error) : t("common.error")}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? t("common.saving") : t("payroll.newPeriod")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
