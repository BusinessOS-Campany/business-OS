"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createSupplierAction } from "@/actions/pharmacy";
import { type ActionResult } from "@/lib/result";
import { toast } from "sonner";

export function SupplierForm({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("pharmacy");
  const tc = useTranslations("common");
  const router = useRouter();

  const [state, action, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    createSupplierAction,
    null
  );

  React.useEffect(() => {
    if (state?.ok) {
      toast.success(tc("saved"));
      onCreated();
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(tc("error"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  return (
    <form action={action} className="space-y-3">
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-name-ar">{t("supplierName")} (العربية)</Label>
            <Input id="sup-name-ar" name="nameAr" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-name-en">{t("supplierName")} (English)</Label>
            <Input id="sup-name-en" name="nameEn" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-phone">{t("supplierPhone")}</Label>
            <Input id="sup-phone" name="phone" dir="ltr" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-email">{t("supplierEmail")}</Label>
            <Input id="sup-email" name="email" type="email" dir="ltr" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-tax">{t("supplierTaxNo")}</Label>
            <Input id="sup-tax" name="taxNo" dir="ltr" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-address">{t("supplierAddress")}</Label>
            <Input id="sup-address" name="address" />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="gap-2">
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          {pending ? tc("saving") : tc("create")}
        </Button>
      </div>
    </form>
  );
}