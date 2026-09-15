"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { dispatchTripAction } from "@/actions/ambulance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AmbulanceOption = { id: string; code: string };
type DriverOption = { id: string; nameAr: string; nameEn: string };
type PatientOption = { id: string; mrn: string; nameAr: string; nameEn: string };

type State = { ok: boolean; error?: string } | null;

const PRIORITIES = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "STAT", label: "Stat" },
];

export function DispatchForm({
  locale,
  ambulances,
  drivers,
  patients,
  onDispatched,
}: {
  locale: string;
  ambulances: AmbulanceOption[];
  drivers: DriverOption[];
  patients: PatientOption[];
  onDispatched?: () => void;
}) {
  const t = useTranslations("ambulance");
  const tc = useTranslations("common");
  const router = useRouter();
  const [ambulanceId, setAmbulanceId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [priority, setPriority] = useState("EMERGENCY");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await dispatchTripAction(null, formData);
      if (res?.ok) {
        toast.success(tc("saved"));
        router.refresh();
        onDispatched?.();
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
          <Send className="size-4 text-primary" />
          {t("dispatchTrip")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="ambulanceId" value={ambulanceId} />
          <input type="hidden" name="driverId" value={driverId} />
          <input type="hidden" name="patientId" value={patientId} />
          <input type="hidden" name="priority" value={priority} />
          <div className="space-y-1.5">
            <Label className="text-xs">{t("vehicles")} *</Label>
            <Select value={ambulanceId} onValueChange={setAmbulanceId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("vehicles")} />
              </SelectTrigger>
              <SelectContent>
                {ambulances.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("driver")}</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t("driver")} />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{locale === "ar" ? d.nameAr : d.nameEn}</SelectItem>
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
              <Label className="text-xs">{t("patientName")}</Label>
              <Input name="patientName" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("priority")}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("pickup")} *</Label>
            <Input name="pickupLocation" required className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("destination")}</Label>
            <Input name="destination" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("note")}</Label>
            <Textarea name="note" rows={2} className="text-sm" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error.replace("ambulance.", "")) : tc("error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? tc("saving") : t("dispatch")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}