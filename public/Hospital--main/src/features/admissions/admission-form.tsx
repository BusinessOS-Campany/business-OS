"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BedDouble } from "lucide-react";
import { createAdmissionAction } from "@/actions/admissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PatientOption = { id: string; mrn: string; nameAr: string; nameEn: string };
type BedOption = { id: string; code: string; roomNameAr: string; roomNameEn: string; roomCode: string };
type DoctorOption = { id: string; nameAr: string; nameEn: string };
type DeptOption = { id: string; nameAr: string; nameEn: string };

type State = { ok: boolean; error?: string; id?: string } | null;

const TYPES: { value: string; key: string }[] = [
  { value: "EMERGENCY", key: "admissions.typeEmergency" },
  { value: "PLANNED", key: "admissions.typePlanned" },
  { value: "TRANSFER", key: "admissions.typeTransfer" },
];

export function AdmissionForm({
  locale,
  patients,
  beds,
  doctors,
  departments,
}: {
  locale: string;
  patients: PatientOption[];
  beds: BedOption[];
  doctors: DoctorOption[];
  departments: DeptOption[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [bedId, setBedId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [admissionType, setAdmissionType] = useState("PLANNED");
  const [isIcu, setIsIcu] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await createAdmissionAction(null, formData);
      if (res?.ok) {
        toast.success(t("admissions.new"));
        if (res.data?.id) router.replace(`/admissions/${res.data.id}`);
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
          <BedDouble className="size-4 text-primary" />
          {t("admissions.new")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="patientId" value={patientId} />
          <input type="hidden" name="bedId" value={bedId} />
          <input type="hidden" name="attendingDoctorId" value={doctorId} />
          <input type="hidden" name="departmentId" value={departmentId} />
          <input type="hidden" name="admissionType" value={admissionType} />
          <input type="hidden" name="isIcu" value={isIcu ? "on" : ""} />
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admissions.selectPatient")} *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("admissions.selectPatient")} />
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
              <Label className="text-xs">{t("admissions.admissionType")} *</Label>
              <Select value={admissionType} onValueChange={setAdmissionType}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue>{t(`${TYPES.find((x) => x.value === admissionType)?.key ?? "admissions.typePlanned"}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((x) => (
                    <SelectItem key={x.value} value={x.value}>
                      {t(x.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("admissions.selectDepartment")}</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t("admissions.selectDepartment")} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {locale === "ar" ? d.nameAr : d.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admissions.selectBed")}</Label>
            <Select value={bedId} onValueChange={setBedId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("admissions.selectBed")} />
              </SelectTrigger>
              <SelectContent>
                {beds.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">{t("admissions.noBeds")}</div>
                )}
                {beds.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.code} — {locale === "ar" ? b.roomNameAr : b.roomNameEn} ({b.roomCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admissions.attendings")}</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("admissions.selectDoctor")} />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {locale === "ar" ? d.nameAr : d.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admissions.provisionalDiagnosis")}</Label>
            <Input name="provisionalDiagnosis" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admissions.carePlan")}</Label>
            <Textarea name="carePlan" rows={2} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admissions.expectedDischarge")}</Label>
            <Input name="expectedDischargeAt" type="datetime-local" className="h-8 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isIcu} onCheckedChange={(v) => setIsIcu(v === true)} />
            {t("admissions.icu")}
          </label>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : t("common.error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("common.saving") : t("admissions.new")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}