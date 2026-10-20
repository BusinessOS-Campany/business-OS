"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import { createShiftAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type State = { ok: boolean; error?: string } | null;

export function ShiftForm() {
  const t = useTranslations();
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await createShiftAction(null, formData);
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
          <PlusCircle className="size-4 text-primary" />
          {t("hr.shifts")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name Ar *</Label>
              <Input name="nameAr" required className="h-8 text-sm" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Name En *</Label>
              <Input name="nameEn" required className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("time")} Start</Label>
              <Input name="startTime" type="time" defaultValue="08:00" className="h-8 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("time")} End</Label>
              <Input name="endTime" type="time" defaultValue="16:00" className="h-8 text-sm" dir="ltr" />
            </div>
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : tc("error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? tc("saving") : t("common.add")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}