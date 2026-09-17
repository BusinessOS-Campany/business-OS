"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { updatePayrollLineAction } from "@/actions/payroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EditableLine = {
  id: string;
  label: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  overtime: number;
  bonuses: number;
  advances: number;
  loans: number;
  note: string | null;
};

type State = { ok: boolean; error?: string } | null;

export function LineEditForm({ lines, disabled }: { lines: EditableLine[]; disabled?: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(lines[0]?.id ?? "");
  const selected = lines.find((l) => l.id === selectedId);

  const [state, formAction, isPending] = useActionState(async (_: State, formData: FormData) => {
    const res = await updatePayrollLineAction(selectedId, null, formData);
    if (res?.ok) {
      toast.success(t("common.updated"));
      router.refresh();
      return { ok: true };
    }
    return { ok: false, error: res?.error };
  }, null);

  if (lines.length === 0) return null;

  if (disabled) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pencil className="size-4 text-primary" />
          {t("common.edit")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("employees.title")}</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lines.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <form key={selected.id} action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <input type="hidden" name="lineId" value={selected.id} />
            <div className="space-y-1.5">
              <Label className="text-xs">{t("payroll.allowances")}</Label>
              <Input name="allowances" type="number" step="0.01" defaultValue={selected.allowances} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("payroll.overtime")}</Label>
              <Input name="overtime" type="number" step="0.01" defaultValue={selected.overtime} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("payroll.bonuses")}</Label>
              <Input name="bonuses" type="number" step="0.01" defaultValue={selected.bonuses} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("payroll.deductions")}</Label>
              <Input name="deductions" type="number" step="0.01" defaultValue={selected.deductions} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("payroll.advances")}</Label>
              <Input name="advances" type="number" step="0.01" defaultValue={selected.advances} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("payroll.loans")}</Label>
              <Input name="loans" type="number" step="0.01" defaultValue={selected.loans} className="h-8 text-sm" />
            </div>
            <div className="col-span-2 space-y-1.5 sm:col-span-3">
              <Label className="text-xs">{t("common.notes")}</Label>
              <Textarea name="note" defaultValue={selected.note ?? ""} rows={2} className="text-sm" />
            </div>
            {state && !state.ok && (
              <p className="col-span-2 text-xs text-destructive sm:col-span-3">{t(state.error ?? "common.error")}</p>
            )}
            <div className="col-span-2 sm:col-span-3">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
