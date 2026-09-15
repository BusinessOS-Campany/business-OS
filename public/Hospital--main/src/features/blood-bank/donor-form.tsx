"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createDonorAction } from "@/actions/blood-bank";
import { BLOOD_GROUPS } from "@/lib/services/blood-bank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

type State = { ok: boolean; error?: string } | null;

export function DonorForm() {
  const t = useTranslations("bloodbank");
  const tc = useTranslations("common");
  const router = useRouter();
  const [bloodGroup, setBloodGroup] = useState("UNKNOWN");
  const [gender, setGender] = useState("");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await createDonorAction(null, formData);
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
          <UserPlus className="size-4 text-primary" />
          {t("newDonor")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("name")} (AR) *</Label>
              <Input name="nameAr" required className="h-8 text-sm" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("name")} (EN) *</Label>
              <Input name="nameEn" required className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("phone")}</Label>
              <Input name="phone" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("identityNo")}</Label>
              <Input name="identityNo" className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("gender")}</Label>
              <input type="hidden" name="gender" value={gender} />
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={tc("gender")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">{tc("male")}</SelectItem>
                  <SelectItem value="FEMALE">{tc("female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("bloodGroup")}</Label>
              <input type="hidden" name="bloodGroup" value={bloodGroup} />
              <Select value={bloodGroup} onValueChange={setBloodGroup}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error.replace("bloodbank.", "")) : tc("error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? tc("saving") : tc("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}