"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Stethoscope } from "lucide-react";
import { updateCarePlanAction } from "@/actions/admissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type State = { ok: boolean; error?: string } | null;

export function CarePlanForm({
  admissionId,
  initialDiagnosis,
  initialCarePlan,
}: {
  admissionId: string;
  initialDiagnosis: string | null;
  initialCarePlan: string | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await updateCarePlanAction(admissionId, null, formData);
      if (res?.ok) {
        toast.success(t("common.updated"));
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
          <Stethoscope className="size-4 text-primary" />
          {t("admissions.carePlan")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admissions.provisionalDiagnosis")}</Label>
            <Input name="provisionalDiagnosis" defaultValue={initialDiagnosis ?? ""} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admissions.carePlan")}</Label>
            <Textarea name="carePlan" defaultValue={initialCarePlan ?? ""} rows={3} className="text-sm" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : t("common.error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("common.saving") : t("admissions.saveCarePlan")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}