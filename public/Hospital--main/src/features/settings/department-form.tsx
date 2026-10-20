"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDepartmentAction } from "@/actions/settings";
import { type ActionResult } from "@/lib/result";

const TYPES = [
  { value: "CLINICAL", key: "examRoom" },
  { value: "LABORATORY", key: "labRoom" },
  { value: "RADIOLOGY", key: "radRoom" },
  { value: "PHARMACY", key: "pharmacyStore" },
  { value: "OPERATING", key: "operatingRoom" },
] as const;

export type BranchOption = { id: string; nameAr: string; nameEn: string };

export function DepartmentForm({ branches, locale }: { branches: BranchOption[]; locale: string }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [type, setType] = React.useState("CLINICAL");
  const [branchId, setBranchId] = React.useState(branches[0]?.id ?? "");

  const [state, action, pending] = useActionState(
    async (_: ActionResult | null, formData: FormData) => createDepartmentAction(null, formData),
    null
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(tc("created"));
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(tc("error"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  const submit = (formData: FormData) => {
    formData.set("type", type);
    formData.set("branchId", branchId);
    action(formData);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="size-4 text-primary" />
          {t("newDepartment")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("deptCode")} *</Label>
            <Input name="code" required className="h-8 text-sm" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("deptNameEn")} *</Label>
            <Input name="nameEn" required className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("deptNameAr")} *</Label>
            <Input name="nameAr" required dir="rtl" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("deptType")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((ty) => (
                  <SelectItem key={ty.value} value={ty.value}>
                    {t(ty.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{t("branchesSettings")} *</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue placeholder={t("branchesSettings")} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {locale === "ar" ? b.nameAr : b.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {state && !state.ok && <p className="text-xs text-destructive sm:col-span-2">{tc("error")}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" className="gap-1.5" disabled={pending || !branchId}>
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {pending ? tc("saving") : t("newDepartment")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
