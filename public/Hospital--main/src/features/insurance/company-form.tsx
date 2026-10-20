"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { saveCompanyAction } from "@/actions/insurance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type State = { ok: boolean; error?: string } | null;

export type CompanyInitial = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
};

export function CompanyForm({ initial }: { initial?: CompanyInitial | null }) {
  const t = useTranslations();
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await saveCompanyAction(null, formData);
      if (res?.ok) {
        toast.success(t("common.saved"));
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
          <Building2 className="size-4 text-primary" />
          {initial ? t("insurance.editCompany") : t("insurance.newCompany")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={initial?.id ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("insurance.companyCode")} *</Label>
              <Input name="code" defaultValue={initial?.code ?? ""} required className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("insurance.companyNameAr")} *</Label>
              <Input name="nameAr" defaultValue={initial?.nameAr ?? ""} required className="h-8 text-sm" dir="rtl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("insurance.companyNameEn")}</Label>
            <Input name="nameEn" defaultValue={initial?.nameEn ?? ""} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.phone")}</Label>
              <Input name="phone" defaultValue={initial?.phone ?? ""} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("common.email")}</Label>
              <Input name="email" type="email" defaultValue={initial?.email ?? ""} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("patients.address")}</Label>
            <Input name="address" defaultValue={initial?.address ?? ""} className="h-8 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="isActive" defaultChecked={initial ? initial.isActive : true} />
            {t("insurance.active")}
          </label>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : t("common.error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("common.saving") : t("insurance.saveCompany")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}