"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBranchAction } from "@/actions/settings";
import { type ActionResult } from "@/lib/result";

export function BranchForm() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (_: ActionResult | null, formData: FormData) => createBranchAction(null, formData),
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="size-4 text-primary" />
          {t("addBranch")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("name")} (EN) *</Label>
            <Input name="nameEn" required className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("name")} (AR) *</Label>
            <Input name="nameAr" required dir="rtl" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("deptCode")} *</Label>
            <Input name="code" required dir="ltr" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("phone")}</Label>
            <Input name="phone" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("email")}</Label>
            <Input name="email" type="email" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("description")}</Label>
            <Input name="address" className="h-8 text-sm" />
          </div>
          {state && !state.ok && <p className="text-xs text-destructive sm:col-span-2">{tc("error")}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" className="gap-1.5" disabled={pending}>
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {pending ? tc("saving") : t("addBranch")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
