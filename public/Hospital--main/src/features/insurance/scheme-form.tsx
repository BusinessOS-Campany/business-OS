"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Layers } from "lucide-react";
import { saveSchemeAction } from "@/actions/insurance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type State = { ok: boolean; error?: string } | null;

export type SchemeCompany = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
};

export type SchemeInitial = {
  id: string;
  companyId: string;
  nameAr: string;
  nameEn: string | null;
  coverageRate: string;
  annualLimit: string | null;
  isActive: boolean;
};

export function SchemeForm({
  companies,
  initial,
  defaultCompanyId,
  locale,
  onSaved,
}: {
  companies: SchemeCompany[];
  initial?: SchemeInitial | null;
  defaultCompanyId?: string;
  locale: string;
  onSaved?: () => void;
}) {
  const t = useTranslations("insurance");
  const tc = useTranslations("common");
  const router = useRouter();
  const [companyId, setCompanyId] = useState(initial?.companyId ?? defaultCompanyId ?? "");

  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      formData.set("companyId", companyId);
      const res = await saveSchemeAction(null, formData);
      if (res?.ok) {
        toast.success(tc("saved"));
        router.refresh();
        onSaved?.();
        return { ok: true };
      }
      return { ok: false, error: res?.error };
    },
    null
  );

  const selected = companies.find((c) => c.id === companyId);

  return (
    <form action={formAction} className="contents">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("company")} *</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-full h-8 text-sm">
              <SelectValue placeholder={t("selectCompany")} />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {locale === "ar" ? c.nameAr : (c.nameEn ?? c.nameAr)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("schemeNameAr")} *</Label>
          <Input name="nameAr" defaultValue={initial?.nameAr ?? ""} required className="h-8 text-sm" dir="rtl" />
        </div>
      </div>
      <div className="space-y-1.5 mt-3">
        <Label className="text-xs">{t("schemeNameEn")}</Label>
        <Input name="nameEn" defaultValue={initial?.nameEn ?? ""} className="h-8 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("coverageRate")} (%) *</Label>
          <Input name="coverageRate" type="number" min="1" max="100" step="0.01" defaultValue={initial?.coverageRate ?? "80"} required className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("annualLimit")}</Label>
          <Input name="annualLimit" type="number" min="0" step="0.01" defaultValue={initial?.annualLimit ?? ""} className="h-8 text-sm" />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <Checkbox name="isActive" defaultChecked={initial ? initial.isActive : true} />
        {t("active")}
      </label>
      <input type="hidden" name="schemeId" value={initial?.id ?? ""} />
      {state && !state.ok && (
        <p className="mt-2 text-xs text-destructive">{state.error ? (state.error.startsWith("insurance.") ? t(state.error) : tc(state.error)) : tc("error")}</p>
      )}
      <div className="mt-4 flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !companyId || !selected}>
          {isPending ? tc("saving") : t("saveScheme")}
        </Button>
      </div>
    </form>
  );
}