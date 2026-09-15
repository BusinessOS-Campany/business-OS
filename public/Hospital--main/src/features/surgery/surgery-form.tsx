"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { createSurgeryAction } from "@/actions/surgery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PatientOption = { id: string; mrn: string; nameAr: string; nameEn: string; phone: string | null };
type RoomOption = { id: string; code: string; nameAr: string; nameEn: string };
type StaffOption = { id: string; nameAr: string; nameEn: string };

type State = { ok: boolean; error?: string; id?: string } | null;

export function SurgeryForm({
  locale,
  patients,
  rooms,
  surgeons,
  anesthesiologists,
}: {
  locale: string;
  patients: PatientOption[];
  rooms: RoomOption[];
  surgeons: StaffOption[];
  anesthesiologists: StaffOption[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [surgeonId, setSurgeonId] = useState("");
  const [anesthesiologistId, setAnesthesiologistId] = useState("");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await createSurgeryAction(null, formData);
      if (res?.ok) {
        toast.success(tc("updated"));
        if (res.data?.id) router.replace(`/surgery/${res.data.id}`);
        else router.refresh();
        return { ok: true, id: res.data?.id };
      }
      return { ok: false, error: res?.error };
    },
    null
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-primary" />
          {t("surgery.newSurgery")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="patientId" value={patientId} />
          <input type="hidden" name="operatingRoomId" value={roomId} />
          <input type="hidden" name="surgeonId" value={surgeonId} />
          <input type="hidden" name="anesthesiologistId" value={anesthesiologistId} />
          <div className="space-y-1.5">
            <Label className="text-xs">{t("common.patient")} *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("common.patient")} />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {locale === "ar" ? p.nameAr : p.nameEn} ({p.mrn})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("surgery.procedureAr")} *</Label>
              <Input name="procedureNameAr" required className="h-8 text-sm" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("surgery.procedureEn")}</Label>
              <Input name="procedureNameEn" className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("surgery.scheduledAt")}</Label>
            <Input name="scheduledAt" type="datetime-local" className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("surgery.operatingRooms")}</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t("surgery.rooms")} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} — {locale === "ar" ? r.nameAr : r.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("surgery.surgeon")}</Label>
              <Select value={surgeonId} onValueChange={setSurgeonId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t("surgery.surgeon")} />
                </SelectTrigger>
                <SelectContent>
                  {surgeons.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {locale === "ar" ? s.nameAr : s.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("surgery.anesthesiologist")}</Label>
              <Select value={anesthesiologistId} onValueChange={setAnesthesiologistId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t("surgery.anesthesiologist")} />
                </SelectTrigger>
                <SelectContent>
                  {anesthesiologists.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {locale === "ar" ? s.nameAr : s.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("surgery.surgicalNotes")}</Label>
            <Textarea name="surgeryNotes" rows={2} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("surgery.preOpChecklist")}</Label>
            <Textarea name="preOpChecklist" rows={2} className="text-sm" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : t("common.error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("common.saving") : t("surgery.newSurgery")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  function tc(k: string): string {
    return t(k);
  }
}