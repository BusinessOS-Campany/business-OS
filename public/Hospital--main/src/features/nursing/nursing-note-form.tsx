"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import { addNursingNoteAction } from "@/actions/nursing";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdmissionOption = { id: string; admissionNo: string; isIcu: boolean; patientNameAr: string; patientNameEn: string; mrn: string };
type State = { ok: boolean; error?: string } | null;

const CATEGORIES = [
  { value: "GENERAL", key: "nursing.catGeneral" },
  { value: "ROUND", key: "nursing.catRound" },
  { value: "PAIN", key: "nursing.catPain" },
  { value: "WOUND", key: "nursing.catWound" },
  { value: "IO", key: "nursing.catIO" },
  { value: "DISCHARGE", key: "nursing.catDischarge" },
];

export function NursingNoteForm({
  locale,
  admissions,
  defaultAdmissionId,
}: {
  locale: string;
  admissions: AdmissionOption[];
  defaultAdmissionId?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [admissionId, setAdmissionId] = useState(defaultAdmissionId ?? "");
  const [category, setCategory] = useState("GENERAL");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await addNursingNoteAction(admissionId, null, formData);
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
          <PlusCircle className="size-4 text-primary" />
          {t("nursing.addNote")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="category" value={category} />
          <div className="space-y-1.5">
            <Label className="text-xs">{t("nursing.patient")} *</Label>
            <Select value={admissionId} onValueChange={setAdmissionId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("nursing.patient")} />
              </SelectTrigger>
              <SelectContent>
                {admissions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.admissionNo} — {locale === "ar" ? a.patientNameAr : a.patientNameEn} ({a.mrn})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("nursing.noteCategory")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue>{t(CATEGORIES.find((c) => c.value === category)?.key ?? "nursing.catGeneral")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {t(c.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("common.notes")} *</Label>
            <Textarea name="note" required rows={3} className="text-sm" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : t("common.error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending || admissionId === ""}>
            {isPending ? t("common.saving") : t("nursing.addNote")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}