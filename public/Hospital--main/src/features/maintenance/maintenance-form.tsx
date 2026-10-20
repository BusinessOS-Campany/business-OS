"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { createMaintenanceRequestAction } from "@/actions/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AssetOption = { id: string; assetNo: string; nameAr: string; nameEn: string; serialNo: string | null };
type EmployeeOption = { id: string; nameAr: string; nameEn: string };

type State = { ok: boolean; error?: string; id?: string } | null;

export function MaintenanceForm({
  locale,
  assets,
  employees,
}: {
  locale: string;
  assets: AssetOption[];
  employees: EmployeeOption[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [assetId, setAssetId] = useState("");
  const [type, setType] = useState("CORRECTIVE");
  const [technicianId, setTechnicianId] = useState("");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await createMaintenanceRequestAction(null, formData);
      if (res?.ok) {
        toast.success(tc("updated"));
        if (res.data?.id) router.replace(`/maintenance/${res.data.id}`);
        else router.refresh();
        return { ok: true, id: res.data?.id };
      }
      return { ok: false, error: res?.error };
    },
    null
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="size-4 text-primary" />
          {t("maintenance.newRequest")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="assetId" value={assetId} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="technicianId" value={technicianId} />
          <div className="space-y-1.5">
            <Label className="text-xs">{t("assets.title")} *</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("assets.title")} />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.assetNo} — {locale === "ar" ? a.nameAr : a.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("appointments.type")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PREVENTIVE">{t("maintenance.typePreventive")}</SelectItem>
                <SelectItem value="CORRECTIVE">{t("maintenance.typeCorrective")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("common.description")} *</Label>
            <Textarea name="description" rows={3} className="text-sm" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("employees.title")}</Label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("employees.title")} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {locale === "ar" ? e.nameAr : e.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("surgery.scheduledAt")}</Label>
            <Input name="scheduledAt" type="datetime-local" className="h-8 text-sm" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : t("common.error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("common.saving") : t("maintenance.newRequest")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  function tc(k: string): string {
    return t(k);
  }
}