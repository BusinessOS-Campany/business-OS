"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { Droplets, PlusCircle } from "lucide-react";
import { addFluidItemAction } from "@/actions/nursing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";

type AdmissionOption = { id: string; admissionNo: string; patientNameAr: string; patientNameEn: string; mrn: string };
export type FluidRow = {
  id: string;
  admissionId: string | null;
  admissionNo: string | null;
  patientNameAr: string | null;
  patientNameEn: string | null;
  type: string;
  category: string;
  amount: number;
  recordedAt: string;
};
type State = { ok: boolean; error?: string } | null;

const TYPE_LABEL: Record<string, string> = {
  INTAKE: "nursing.intake",
  OUTPUT: "nursing.output",
};

const TYPE_VARIANT: Record<string, "info" | "secondary" | "warning" | "success" | "default" | "muted" | "destructive"> = {
  INTAKE: "info",
  OUTPUT: "warning",
};

function buildFluidColumns(locale: string, t: (k: string) => string): ColumnDef<FluidRow>[] {
  return [
    {
      id: "patient",
      header: t("nursing.patient"),
      renderRow: (row) =>
        row.admissionNo ? (
          <span className="truncate">
            <Link href={`/admissions/${row.admissionId}`} className="font-medium hover:underline">
              {row.admissionNo}
            </Link>
            <span className="text-muted-foreground ml-1 text-xs">{locale === "ar" ? row.patientNameAr : row.patientNameEn}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "type",
      header: t("common.status"),
      renderRow: (row) => <Badge variant={TYPE_VARIANT[row.type] ?? "outline"}>{t(TYPE_LABEL[row.type] ?? row.type)}</Badge>,
    },
    {
      id: "category",
      header: t("nursing.fluidCategory"),
      renderRow: (row) => <span className="text-sm">{row.category}</span>,
    },
    {
      id: "amount",
      header: t("common.amount"),
      renderRow: (row) => <span className="tabular-nums text-sm font-medium">{row.amount}</span>,
      sortValue: (row) => row.amount,
    },
    {
      id: "recordedAt",
      header: t("nursing.recordedAt"),
      renderRow: (row) => <span className="tabular-nums text-xs">{new Date(row.recordedAt).toLocaleString()}</span>,
      sortValue: (row) => row.recordedAt,
    },
  ];
}

export function FluidBoard({
  locale,
  admissions,
  defaultAdmissionId,
  rows,
  intake,
  output,
}: {
  locale: string;
  admissions: AdmissionOption[];
  defaultAdmissionId?: string;
  rows: FluidRow[];
  intake: number;
  output: number;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [admissionId, setAdmissionId] = useState(defaultAdmissionId ?? "");
  const [fluidType, setFluidType] = useState("INTAKE");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await addFluidItemAction(admissionId, null, formData);
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
          <Droplets className="size-4 text-primary" />
          {t("nursing.intakeOutput")}
          <span className="text-muted-foreground ml-auto text-xs font-normal tabular-nums">
            {t("nursing.intake")}: {intake} · {t("nursing.output")}: {output}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="type" value={fluidType} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">{t("nursing.patient")}</Label>
              <Select value={admissionId} onValueChange={setAdmissionId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t("nursing.patient")} />
                </SelectTrigger>
                <SelectContent>
                  {admissions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.admissionNo} — {locale === "ar" ? a.patientNameAr : a.patientNameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("common.status")}</Label>
              <Select value={fluidType} onValueChange={setFluidType}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue>{t(TYPE_LABEL[fluidType])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTAKE">{t("nursing.intake")}</SelectItem>
                  <SelectItem value="OUTPUT">{t("nursing.output")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("nursing.fluidCategory")}</Label>
              <Input name="category" required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("common.amount")} *</Label>
              <Input name="amount" type="number" required className="h-8 text-sm" min="0" step="0.1" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" disabled={isPending || admissionId === ""}>
              <PlusCircle className="size-4" />
              {isPending ? t("common.saving") : fluidType === "INTAKE" ? t("nursing.addIntake") : t("nursing.addOutput")}
            </Button>
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : t("common.error")}</p>
          )}
        </form>
        <div className="overflow-x-auto">
          <DataTable
            columns={buildFluidColumns(locale, t)}
            data={rows}
            rowKey={(r) => r.id}
            searchPlaceholder={`${t("common.search")} ${t("nursing.intakeOutput")}`}
            searchValue={(r) => `${r.admissionNo ?? ""} ${r.patientNameAr ?? ""} ${r.patientNameEn ?? ""} ${r.category} ${r.type}`}
            emptyIcon={Droplets}
            emptyTitle={t("nursing.intakeOutput")}
            showColumnsControl={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}