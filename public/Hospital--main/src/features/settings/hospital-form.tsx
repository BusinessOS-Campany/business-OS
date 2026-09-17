"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2, Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateHospitalSettingsAction } from "@/actions/settings";
import { type ActionResult } from "@/lib/result";

export function HospitalForm({ settings }: { settings: Record<string, string> }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (_: ActionResult | null, formData: FormData) => updateHospitalSettingsAction(null, formData),
    null
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(t("saved"));
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(tc("error"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  const v = (key: string) => settings[key] ?? "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="size-4 text-primary" />
          {t("hospital")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("hospitalNameEn")}</Label>
            <Input name="hospital_name_en" defaultValue={v("hospital_name_en")} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("hospitalNameAr")}</Label>
            <Input name="hospital_name_ar" dir="rtl" defaultValue={v("hospital_name_ar")} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("hospitalPhone")}</Label>
            <Input name="hospital_phone" defaultValue={v("hospital_phone")} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("hospitalEmail")}</Label>
            <Input name="hospital_email" type="email" defaultValue={v("hospital_email")} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("hospitalGovernorate")}</Label>
            <Input name="hospital_governorate" defaultValue={v("hospital_governorate")} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("defaultCurrency")}</Label>
            <Input name="default_currency" defaultValue={v("default_currency") || "YER"} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{t("hospitalAddress")}</Label>
            <Input name="hospital_address" defaultValue={v("hospital_address")} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{t("hospitalLogo")}</Label>
            <Input name="hospital_logo" defaultValue={v("hospital_logo")} className="h-8 text-sm" dir="ltr" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{t("invoiceFooter")}</Label>
            <Textarea name="invoice_footer" defaultValue={v("invoice_footer")} rows={2} className="text-sm" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{t("general")}</Label>
            <Input name="hospital_note" defaultValue={v("hospital_note")} className="h-8 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" className="gap-1.5" disabled={pending}>
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : <Building2 className="size-4" />}
              {pending ? tc("saving") : t("saveSettings")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
