"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HeartHandshake } from "lucide-react";
import { recordDonationAction } from "@/actions/blood-bank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DonorOption = { id: string; nameAr: string; nameEn: string; bloodGroup: string };
type PatientOption = { id: string; mrn: string; nameAr: string; nameEn: string };

type State = { ok: boolean; error?: string } | null;

export function DonationForm({ locale, donors, patients }: { locale: string; donors: DonorOption[]; patients: PatientOption[] }) {
  const t = useTranslations("bloodbank");
  const tc = useTranslations("common");
  const router = useRouter();
  const [donorId, setDonorId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await recordDonationAction(null, formData);
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
          <HeartHandshake className="size-4 text-primary" />
          {t("newDonation")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="donorId" value={donorId} />
          <input type="hidden" name="patientId" value={patientId} />
          <div className="space-y-1.5">
            <Label className="text-xs">{t("donors")} *</Label>
            <Select value={donorId} onValueChange={setDonorId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("donors")} />
              </SelectTrigger>
              <SelectContent>
                {donors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {locale === "ar" ? d.nameAr : d.nameEn} ({d.bloodGroup.replace("_", " ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("patient")}</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={tc("patient")} />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{locale === "ar" ? p.nameAr : p.nameEn} ({p.mrn})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("units")} *</Label>
              <Input name="units" type="number" min="1" max="4" defaultValue="1" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("hemoglobin")}</Label>
              <Input name="hemoglobin" type="number" min="0" step="0.1" className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("notes")}</Label>
            <Textarea name="notes" rows={2} className="text-sm" />
          </div>
          <p className="text-xs text-muted-foreground">{t("newUnitStatus")}</p>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error.replace("bloodbank.", "")) : tc("error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? tc("saving") : t("recordedDonation")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}