"use client";

import { useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DoorOpen } from "lucide-react";
import { dischargeAdmissionAction, cancelAdmissionAction } from "@/actions/admissions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type State = { ok: boolean; error?: string } | null;

const TYPES = [
  { value: "RECOVERED", key: "admissions.dischargeRecovered" },
  { value: "REFERRED", key: "admissions.dischargeReferred" },
  { value: "AGAINST_MEDICAL_ADVICE", key: "admissions.dischargeAma" },
  { value: "TRANSFERRED", key: "admissions.dischargeTransferred" },
  { value: "DECEASED", key: "admissions.dischargeDeceased" },
  { value: "OTHER", key: "admissions.dischargeOther" },
];

export function DischargeForm({ admissionId }: { admissionId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [dischargeType, setDischargeType] = useState("");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await dischargeAdmissionAction(admissionId, null, formData);
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
          <DoorOpen className="size-4 text-primary" />
          {t("admissions.discharge")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admissions.dischargeType")} *</Label>
            <Select value={dischargeType} onValueChange={setDischargeType}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("admissions.dischargeType")} />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((x) => (
                  <SelectItem key={x.value} value={x.value}>
                    {t(x.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input type="hidden" name="dischargeType" value={dischargeType} />
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admissions.dischargeSummary")}</Label>
            <Textarea name="dischargeSummary" rows={3} className="text-sm" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : t("common.error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending || dischargeType === ""}>
            {isPending ? t("common.saving") : t("admissions.dischargeConfirm")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function CancelAdmissionButton({ admissionId }: { admissionId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = () => {
    if (!window.confirm(t("common.confirmDeleteTitle").replace("{item}", t("admissions.statusCancelled")))) return;
    startTransition(async () => {
      const res = await cancelAdmissionAction(admissionId, null, new FormData());
      if (res?.ok) {
        toast.success(t("common.updated"));
        router.refresh();
      } else {
        toast.error(t(res?.error ?? "common.error"));
      }
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={isPending}>
      {isPending ? t("common.saving") : t("admissions.cancelAdmission")}
    </Button>
  );
}