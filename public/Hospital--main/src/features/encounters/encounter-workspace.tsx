"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ClipboardListIcon,
  ScrollTextIcon,
  ActivityIcon,
  PillIcon,
  FlaskConicalIcon,
  ScanLineIcon,
  PlusIcon,
  Trash2Icon,
  CheckCircle2Icon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  saveClinicalNotesAction,
  addDiagnosisAction,
  removeDiagnosisAction,
  addVitalsAction,
  addPrescriptionAction,
  orderLabAction,
  orderRadAction,
  completeEncounterAction,
} from "@/actions/encounters";
import { formatDateTime } from "@/lib/utils";

const DX_KEY: Record<string, string> = {
  PRIMARY: "diagnosisPrimary",
  SECONDARY: "diagnosisSecondary",
  DIFFERENTIAL: "diagnosisDifferential",
  ADMISSION: "diagnosisAdmission",
  DISCHARGE: "diagnosisDischarge",
};

const CONS_KEY: Record<string, string> = {
  ALERT: "alert",
  VOICE: "voice",
  PAIN: "pain",
  UNRESPONSIVE: "unresponsive",
};

const MODALITY_KEY: Record<string, string> = {
  XRAY: "xray",
  CT: "ct",
  MRI: "mri",
  ULTRASOUND: "ultrasound",
  MAMMOGRAPHY: "mammography",
  FLUOROSCOPY: "fluoroscopy",
  PET: "pet",
  OTHER: "other",
};

const PRIORITY_KEY: Record<string, string> = {
  ROUTINE: "priorityRoutine",
  URGENT: "priorityUrgent",
  EMERGENCY: "priorityEmergency",
  STAT: "priorityStat",
};

type PatientRef = { id: string; mrn: string; nameAr: string; nameEn: string };
type StaffRef = { id: string; nameAr: string; nameEn: string };

type DiagnosisRow = {
  id: string;
  code?: string | null;
  nameAr: string;
  nameEn?: string | null;
  dxType: string;
  isPrimary: boolean;
};

type VitalsRow = {
  id: string;
  recordedAt: string;
  temperature?: string | null;
  pulse?: number | null;
  respiratoryRate?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  o2sat?: number | null;
  weight?: string | null;
  height?: string | null;
  bmi?: string | null;
  bloodGlucose?: string | null;
  painScore?: number | null;
  consciousness?: string | null;
  recordedBy?: StaffRef | null;
};

type PrescriptionRow = {
  id: string;
  prescriptionNo: string;
  prescriptionNoPerson?: string;
  status: string;
  createdAt: string;
  instructions?: string | null;
  doctor?: StaffRef | null;
  items: {
    id: string;
    medicineNameAr: string;
    medicineNameEn?: string | null;
    dosage?: string | null;
    route?: string | null;
    frequency?: string | null;
    duration?: string | null;
    quantity: number;
    unit?: string | null;
    instructions?: string | null;
  }[];
};

type LabOrderRow = {
  id: string;
  orderNo: string;
  status: string;
  createdAt: string;
  clinicalNote?: string | null;
  items: { id: string; testId: string; test: { id: string; code: string; nameAr: string; nameEn: string } }[];
};

type RadOrderRow = {
  id: string;
  orderNo: string;
  status: string;
  modality: string;
  bodyPart?: string | null;
  createdAt: string;
};

type EncounterData = {
  id: string;
  encounterNo: string;
  status: string;
  chiefComplaint?: string | null;
  hpi?: string | null;
  pastMedicalHistory?: string | null;
  surgicalHistory?: string | null;
  familyHistory?: string | null;
  socialHistory?: string | null;
  examination?: string | null;
  assessment?: string | null;
  plan?: string | null;
  clinicalNotes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  patient: PatientRef & { gender?: string | null; age?: number | null; phone?: string | null; bloodGroup?: string | null };
  doctor?: StaffRef | null;
  diagnoses: DiagnosisRow[];
  vitals: VitalsRow[];
  prescriptions: PrescriptionRow[];
  labOrders: LabOrderRow[];
  radOrders: RadOrderRow[];
};

type LabTest = { id: string; code: string; nameAr: string; nameEn: string };

function FormShell({
  children,
  onSubmit,
  pending,
  submitLabel,
}: {
  children: React.ReactNode;
  onSubmit: (formData: FormData) => void;
  pending: boolean;
  submitLabel: string;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      {children}
      <div className="flex justify-end">
        <Button type="submit" size="sm" className="gap-1.5" disabled={pending}>
          {pending && <Loader2Icon className="size-3.5 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function EncounterWorkspace({
  encounter,
  labTests,
  locale,
}: {
  encounter: EncounterData;
  labTests: LabTest[];
  locale: string;
}) {
  const t = useTranslations("encounters");
  const tv = useTranslations("vitals");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const patientName = locale === "ar" ? encounter.patient.nameAr : encounter.patient.nameEn;

  const run = (action: Promise<{ ok?: boolean; error?: string }>, onDone?: () => void) => {
    startTransition(async () => {
      const res = await action;
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
        onDone?.();
      } else {
        const err = res?.error ?? "";
        if (err.startsWith("common.")) toast.error(tc(err));
        else if (err.startsWith("encounters.")) toast.error(t(err));
        else toast.error(tc("error"));
      }
    });
  };

  const submitDoc = (formData: FormData) =>
    run(saveClinicalNotesAction(encounter.id, null, formData));

  const submitDiagnosis = (formData: FormData) => run(addDiagnosisAction(encounter.id, null, formData));
  const removeDiagnosis = (id: string) => run(removeDiagnosisAction(id, null));

  const submitVitals = (formData: FormData) => run(addVitalsAction(encounter.id, null, formData));

  const [items, setItems] = React.useState<Record<string, string>[]>([
    { medicineNameAr: "", medicineNameEn: "", dosage: "", route: "", frequency: "", duration: "", quantity: "1", unit: "", instructions: "" },
  ]);
  const submitPrescription = (formData: FormData) => {
    formData.set("items", JSON.stringify(items.filter((i) => i.medicineNameAr.trim()).map((i) => ({ ...i, quantity: Number(i.quantity) || 1 }))));
    if (items.some((i) => i.medicineNameAr.trim())) run(addPrescriptionAction(encounter.id, null, formData));
  };

  const [labSel, setLabSel] = React.useState<Record<string, boolean>>({});
  const submitLab = (formData: FormData) => {
    const selected = Object.entries(labSel).filter(([, v]) => v).map(([id]) => ({ id }));
    if (selected.length === 0) return;
    formData.set("testIds", JSON.stringify(selected));
    run(orderLabAction(encounter.id, null, formData));
  };

  const submitRad = (formData: FormData) => run(orderRadAction(encounter.id, null, formData));

  const complete = () => {
    startTransition(async () => {
      const res = await completeEncounterAction(encounter.id, null);
      if (res?.ok) {
        toast.success(tc("updated"));
        router.push("/encounters");
      } else {
        toast.error(tc("error"));
      }
    });
  };

  return (
    <Tabs defaultValue="documentation" className="w-full">
      <TabsList className="w-full justify-start sm:w-auto">
        <TabsTrigger value="documentation"><ClipboardListIcon />{t("clinicalDocumentation")}</TabsTrigger>
        <TabsTrigger value="diagnoses"><ScrollTextIcon />{t("diagnosis")}</TabsTrigger>
        <TabsTrigger value="vitals"><ActivityIcon />{tv("title")}</TabsTrigger>
        <TabsTrigger value="prescriptions"><PillIcon />{t("prescribe")}</TabsTrigger>
        <TabsTrigger value="orders"><FlaskConicalIcon />{t("orders")}</TabsTrigger>
      </TabsList>

      <TabsContent value="documentation" className="mt-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("clinicalDocumentation")}</CardTitle></CardHeader>
          <CardContent>
            <FormShell onSubmit={submitDoc} pending={isPending} submitLabel={tc("save")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldGrid label={t("chiefComplaint")} name="chiefComplaint" textarea defaultValue={encounter.chiefComplaint ?? ""} />
                <FieldGrid label={t("hpi")} name="hpi" textarea defaultValue={encounter.hpi ?? ""} className="md:col-span-2" />
                <FieldGrid label={t("pastMedicalHistory")} name="pastMedicalHistory" textarea defaultValue={encounter.pastMedicalHistory ?? ""} />
                <FieldGrid label={t("surgicalHistory")} name="surgicalHistory" textarea defaultValue={encounter.surgicalHistory ?? ""} />
                <FieldGrid label={t("familyHistory")} name="familyHistory" textarea defaultValue={encounter.familyHistory ?? ""} />
                <FieldGrid label={t("socialHistory")} name="socialHistory" textarea defaultValue={encounter.socialHistory ?? ""} />
                <FieldGrid label={t("examination")} name="examination" textarea defaultValue={encounter.examination ?? ""} />
                <FieldGrid label={t("assessment")} name="assessment" textarea defaultValue={encounter.assessment ?? ""} />
                <FieldGrid label={t("plan")} name="plan" textarea defaultValue={encounter.plan ?? ""} />
                <FieldGrid label={t("notes")} name="clinicalNotes" textarea defaultValue={encounter.clinicalNotes ?? ""} />
              </div>
            </FormShell>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="diagnoses" className="mt-3">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("diagnosis")}</CardTitle></CardHeader>
            <CardContent>
              {encounter.diagnoses.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noDiagnosis")}</p>
              ) : (
                <ul className="divide-y">
                  {encounter.diagnoses.map((d) => (
                    <li key={d.id} className="flex items-center gap-2.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {d.isPrimary ? <Badge variant="default" className="me-1.5">{t("diagnosisPrimary")}</Badge> : null}
                          {d.nameAr}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.code ? `${d.code} · ` : ""}{d.nameEn ?? ""} · {t(DX_KEY[d.dxType] ?? "diagnosisSecondary")}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" disabled={isPending} onClick={() => removeDiagnosis(d.id)}>
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("addDiagnosis")}</CardTitle></CardHeader>
            <CardContent>
              <FormShell onSubmit={submitDiagnosis} pending={isPending} submitLabel={t("addDiagnosis")}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="dl-code">{t("code")}</Label>
                      <Input id="dl-code" name="code" placeholder="ICD-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("dxType")}</Label>
                      <Select name="dxType" defaultValue="PRIMARY">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(DX_KEY).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dl-name-ar">{t("nameAr")}</Label>
                    <Input id="dl-name-ar" name="nameAr" required placeholder={t("nameArPlaceholder")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dl-name-en">{t("nameEn")}</Label>
                    <Input id="dl-name-en" name="nameEn" placeholder={t("nameEnPlaceholder")} />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox id="dl-primary" name="isPrimary" value="1" />
                    <Label htmlFor="dl-primary" className="text-sm font-normal">{t("diagnosisPrimary")}</Label>
                  </div>
                </div>
              </FormShell>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="vitals" className="mt-3">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">{tv("history")}</CardTitle></CardHeader>
            <CardContent>
              {encounter.vitals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tv("noneRecorded")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="py-2 pr-3 text-start">{tc("time")}</th>
                        <th className="py-2 pr-3 text-start">{tv("temperature")}</th>
                        <th className="py-2 pr-3 text-start">{tv("bloodPressure")}</th>
                        <th className="py-2 pr-3 text-start">{tv("pulse")}</th>
                        <th className="py-2 pr-3 text-start">{tv("o2sat")}</th>
                        <th className="py-2 pr-3 text-start">{tv("weight")}</th>
                        <th className="py-2 pr-3 text-start">{tv("bloodGlucose")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {encounter.vitals.map((v) => (
                        <tr key={v.id}>
                          <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{formatDateTime(v.recordedAt, locale)}</td>
                          <td className="py-2 pr-3 tabular-nums">{v.temperature ? `${v.temperature} °C` : "—"}</td>
                          <td className="py-2 pr-3 tabular-nums">
                            {v.systolic ? `${v.systolic}/${v.diastolic ?? "—"}` : "—"}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">{v.pulse ?? "—"}</td>
                          <td className="py-2 pr-3 tabular-nums">{v.o2sat ? `${v.o2sat}%` : "—"}</td>
                          <td className="py-2 pr-3 tabular-nums">{v.weight ? `${v.weight} kg` : "—"}</td>
                          <td className="py-2 pr-3 tabular-nums">{v.bloodGlucose ? `${v.bloodGlucose} mg/dL` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{tv("record")}</CardTitle></CardHeader>
            <CardContent>
              <FormShell onSubmit={submitVitals} pending={isPending} submitLabel={tv("record")}>
                <div className="grid grid-cols-2 gap-2">
                  <VitalsField label={tv("temperature")} name="temperature" placeholder="36.5" />
                  <VitalsField label={tv("pulse")} name="pulse" placeholder="72" />
                  <VitalsField label={tv("systolic")} name="systolic" placeholder="120" />
                  <VitalsField label={tv("diastolic")} name="diastolic" placeholder="80" />
                  <VitalsField label={tv("respiratoryRate")} name="respiratoryRate" placeholder="16" />
                  <VitalsField label={tv("o2sat")} name="o2sat" placeholder="98" />
                  <VitalsField label={tv("weight")} name="weight" placeholder="70" />
                  <VitalsField label={tv("height")} name="height" placeholder="170" />
                  <VitalsField label={tv("bloodGlucose")} name="bloodGlucose" placeholder="90" />
                  <VitalsField label={tv("painScore")} name="painScore" placeholder="0–10" />
                </div>
                <div className="space-y-1.5">
                  <Label>{tv("consciousness")}</Label>
                  <Select name="consciousness" defaultValue="ALERT">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONS_KEY).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{tv(v)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vt-notes">{tc("notes")}</Label>
                  <Textarea id="vt-notes" name="notes" rows={2} />
                </div>
              </FormShell>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="prescriptions" className="mt-3">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("prescribe")}</CardTitle></CardHeader>
            <CardContent>
              {encounter.prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noPrescriptions")}</p>
              ) : (
                <ul className="space-y-3">
                  {encounter.prescriptions.map((p) => (
                    <li key={p.id} className="rounded-lg border bg-muted/20 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{p.prescriptionNo}</span>
                        <Badge variant="outline">{formatDateTime(p.createdAt, locale)}</Badge>
                      </div>
                      <ul className="space-y-1">
                        {p.items.map((it) => (
                          <li key={it.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                            <span className="font-medium">{it.medicineNameAr}</span>
                            {it.medicineNameEn ? <span className="text-xs text-muted-foreground">({it.medicineNameEn})</span> : null}
                            {it.dosage ? <span className="tabular-nums">{it.dosage}</span> : null}
                            {it.route ? <span className="text-muted-foreground">· {it.route}</span> : null}
                            {it.frequency ? <span className="text-muted-foreground">· {it.frequency}</span> : null}
                            {it.duration ? <span className="text-muted-foreground">· {it.duration}</span> : null}
                            {it.quantity ? <span className="tabular-nums">· {it.quantity}{it.unit ? ` ${it.unit}` : ""}</span> : null}
                          </li>
                        ))}
                      </ul>
                      {p.instructions ? <p className="mt-1.5 text-xs text-muted-foreground">{p.instructions}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("addMedication")}</CardTitle></CardHeader>
            <CardContent>
              <FormShell onSubmit={submitPrescription} pending={isPending} submitLabel={t("addMedication")}>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rx-inst">{t("instructions")}</Label>
                    <Textarea id="rx-inst" name="instructions" rows={2} />
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="rounded-lg border bg-muted/10 p-2.5 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder={t("medicineNameAr")} value={item.medicineNameAr} onChange={(e) => setItems((all) => all.map((x, j) => (j === i ? { ...x, medicineNameAr: e.target.value } : x)))} />
                        <Input placeholder={t("medicineNameEn")} value={item.medicineNameEn} onChange={(e) => setItems((all) => all.map((x, j) => (j === i ? { ...x, medicineNameEn: e.target.value } : x)))} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder={t("dosage")} value={item.dosage} onChange={(e) => setItems((all) => all.map((x, j) => (j === i ? { ...x, dosage: e.target.value } : x)))} />
                        <Input placeholder={t("route")} value={item.route} onChange={(e) => setItems((all) => all.map((x, j) => (j === i ? { ...x, route: e.target.value } : x)))} />
                        <Input placeholder={t("frequency")} value={item.frequency} onChange={(e) => setItems((all) => all.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))} />
                        <Input placeholder={t("duration")} value={item.duration} onChange={(e) => setItems((all) => all.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))} />
                        <Input placeholder={t("quantity")} type="number" min={1} value={item.quantity} onChange={(e) => setItems((all) => all.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
                        <Input placeholder={t("unit")} value={item.unit} onChange={(e) => setItems((all) => all.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))} />
                      </div>
                      <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => setItems((all) => all.filter((_, j) => j !== i))}>
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setItems((all) => [...all, { medicineNameAr: "", medicineNameEn: "", dosage: "", route: "", frequency: "", duration: "", quantity: "1", unit: "", instructions: "" }])}>
                    <PlusIcon className="size-3.5" />
                    {tc("add")}
                  </Button>
                </div>
              </FormShell>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="orders" className="mt-3">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("labOrder")}</CardTitle></CardHeader>
            <CardContent>
              <FormShell onSubmit={submitLab} pending={isPending} submitLabel={t("labOrder")}>
                <div className="space-y-3">
                  <LabSelect tests={labTests} selected={labSel} onChange={setLabSel} t={t} tc={tc} locale={locale} />
                  <div className="space-y-1.5">
                    <Label>{t("priority")}</Label>
                    <Select name="priority" defaultValue="ROUTINE">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_KEY).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lb-clin">{t("clinicalNote")}</Label>
                    <Textarea id="lb-clin" name="clinicalNote" rows={2} />
                  </div>
                </div>
              </FormShell>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("radiologyOrder")}</CardTitle></CardHeader>
            <CardContent>
              <FormShell onSubmit={submitRad} pending={isPending} submitLabel={t("radiologyOrder")}>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t("modality")}</Label>
                    <Select name="modality" defaultValue="XRAY">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MODALITY_KEY).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rd-body">{t("bodyPart")}</Label>
                    <Input id="rd-body" name="bodyPart" placeholder="Chest" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rd-clin">{t("clinicalNote")}</Label>
                    <Textarea id="rd-clin" name="clinicalNote" rows={2} />
                  </div>
                </div>
              </FormShell>
              <div className="mt-4">
                {encounter.radOrders.map((r) => (
                  <div key={r.id} className="mb-2 flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">{r.orderNo}</p>
                      <p className="truncate">{t(MODALITY_KEY[r.modality] ?? "other")}{r.bodyPart ? ` · ${r.bodyPart}` : ""}</p>
                    </div>
                    <Badge variant="outline">{formatDateTime(r.createdAt, locale)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("labOrders")}</CardTitle></CardHeader>
            <CardContent>
              {encounter.labOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noLabOrders")}</p>
              ) : (
                <ul className="divide-y">
                  {encounter.labOrders.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{o.orderNo}</span>
                      <span className="min-w-0 flex-1">
                        {o.items.map((it) => (
                          <Badge key={it.id} variant="outline" className="me-1">{locale === "ar" ? it.test.nameAr : it.test.nameEn}</Badge>
                        ))}
                      </span>
                      <Badge variant="muted">{formatDateTime(o.createdAt, locale)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <div className="mt-2 flex justify-end">
        {encounter.status !== "COMPLETED" ? (
          <Button className="gap-1.5" disabled={isPending} onClick={complete}>
            {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckCircle2Icon className="size-4" />}
            {t("complete")}
          </Button>
        ) : (
          <Badge variant="success">{t("statusCompleted")}</Badge>
        )}
      </div>
    </Tabs>
  );
}

function FieldGrid({
  label,
  name,
  defaultValue,
  textarea,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  textarea?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={`f-${name}`}>{label}</Label>
      {textarea ? (
        <Textarea id={`f-${name}`} name={name} rows={2} defaultValue={defaultValue} />
      ) : (
        <Input id={`f-${name}`} name={name} defaultValue={defaultValue} />
      )}
    </div>
  );
}

function VitalsField({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`v-${name}`}>{label}</Label>
      <Input id={`v-${name}`} name={name} type="text" inputMode="decimal" placeholder={placeholder} />
    </div>
  );
}

function LabSelect({
  tests,
  selected,
  onChange,
  t,
  tc,
  locale,
}: {
  tests: LabTest[];
  selected: Record<string, boolean>;
  onChange: (v: Record<string, boolean>) => void;
  t: (k: string) => string;
  tc: (k: string) => string;
  locale: string;
}) {
  const [open, setOpen] = React.useState(false);
  const toggle = (id: string) => onChange({ ...selected, [id]: !selected[id] });
  const selectedCount = Object.values(selected).filter(Boolean).length;
  return (
    <div className="space-y-1.5">
      <Label>{t("selectTests")}</Label>
      <div className="rounded-lg border shadow-sm">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm"
        >
          <span>{selectedCount === 0 ? t("selectTestsPlaceholder") : `${selectedCount} ${tc("selected").replace("{count}", String(selectedCount))}`}</span>
          <Badge variant="secondary">{selectedCount}</Badge>
        </button>
        {open && (
          <div className="max-h-56 overflow-y-auto border-t p-1.5">
            {tests.map((test) => (
              <label key={test.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                <Checkbox checked={Boolean(selected[test.id])} onCheckedChange={() => toggle(test.id)} />
                <span className="min-w-0 flex-1 truncate">{locale === "ar" ? test.nameAr : test.nameEn}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}