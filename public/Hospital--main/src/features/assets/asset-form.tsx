"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Boxes } from "lucide-react";
import { createAssetAction } from "@/actions/assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DepartmentOption = { id: string; nameAr: string; nameEn: string };
type EmployeeOption = { id: string; nameAr: string; nameEn: string };

const CATEGORIES = ["MEDICAL_EQUIPMENT", "COMPUTER", "FURNITURE", "VEHICLE", "MACHINE"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE", "RETIRED", "LOST"] as const;

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "assets.statusActive",
  INACTIVE: "assets.statusInactive",
  UNDER_MAINTENANCE: "assets.statusUnderMaintenance",
  RETIRED: "assets.statusRetired",
  LOST: "assets.statusLost",
};

type State = { ok: boolean; error?: string; id?: string } | null;

export function AssetForm({
  locale,
  departments,
  employees,
}: {
  locale: string;
  departments: DepartmentOption[];
  employees: EmployeeOption[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [category, setCategory] = useState("MEDICAL_EQUIPMENT");
  const [status, setStatus] = useState("ACTIVE");
  const [departmentId, setDepartmentId] = useState("");
  const [custodianId, setCustodianId] = useState("");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await createAssetAction(null, formData);
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
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
          <Boxes className="size-4 text-primary" />
          {t("assets.newAsset")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="departmentId" value={departmentId} />
          <input type="hidden" name="custodianId" value={custodianId} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("encounters.nameAr")} *</Label>
              <Input name="nameAr" required className="h-8 text-sm" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("encounters.nameEn")}</Label>
              <Input name="nameEn" className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("assets.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(STATUS_LABEL[s])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("assets.location")}</Label>
            <Input name="location" className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("admissions.department")}</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t("admissions.department")} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {locale === "ar" ? d.nameAr : d.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("assets.custodian")}</Label>
              <Select value={custodianId} onValueChange={setCustodianId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t("assets.custodian")} />
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
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("assets.serialNo")}</Label>
            <Input name="serialNo" className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.date")}</Label>
              <Input name="purchaseDate" type="date" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("assets.warranty")}</Label>
              <Input name="warrantyUntil" type="date" className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("assets.cost")}</Label>
            <Input name="cost" type="number" min="0" step="0.01" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("common.notes")}</Label>
            <Textarea name="note" rows={2} className="text-sm" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : t("common.error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("common.saving") : t("assets.newAsset")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  function tc(k: string): string {
    return t(k);
  }
}