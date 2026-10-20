"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";
import { createLabTestAction } from "@/actions/laboratory";
import { SAMPLE_TYPES } from "@/lib/services/laboratory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";

type State = { ok: boolean; error?: string } | null;

export function LabTestForm() {
  const t = useTranslations("laboratory");
  const tc = useTranslations("common");
  const router = useRouter();
  const [sampleType, setSampleType] = useState("BLOOD");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await createLabTestAction(null, formData);
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
          <FlaskConical className="size-4 text-primary" />
          {t("addTest")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("nameAr")} *</Label>
              <Input name="nameAr" required className="h-8 text-sm" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("nameEn")} *</Label>
              <Input name="nameEn" required className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("category")}</Label>
              <Input name="category" defaultValue="GENERAL" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sampleType")}</Label>
              <input type="hidden" name="sampleType" value={sampleType} />
              <Select value={sampleType} onValueChange={setSampleType}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("unit")}</Label>
              <Input name="unit" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price (YER)</Label>
              <Input name="price" type="number" min="0" step="0.01" defaultValue="0" className="h-8 text-sm" />
            </div>
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error.replace("laboratory.", "")) : tc("error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending} className={cn("gap-1.5")}>
            {t("addTest")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}