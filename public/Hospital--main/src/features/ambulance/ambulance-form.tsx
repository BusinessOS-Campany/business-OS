"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { createAmbulanceAction } from "@/actions/ambulance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type State = { ok: boolean; error?: string } | null;

export function AmbulanceForm() {
  const t = useTranslations("ambulance");
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await createAmbulanceAction(null, formData);
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
          <Truck className="size-4 text-primary" />
          {t("newVehicle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("code")} *</Label>
              <Input name="code" required className="h-8 text-sm" placeholder="AMB-01" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("plateNo")} *</Label>
              <Input name="plateNo" required className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("model")}</Label>
              <Input name="model" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("capacity")}</Label>
              <Input name="capacity" type="number" min="0" defaultValue="1" className="h-8 text-sm" />
            </div>
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error.replace("ambulance.", "")) : tc("error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {tc("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}