"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical, AlertTriangle, CheckCircle2 } from "lucide-react";
import { saveLabResultAction } from "@/actions/laboratory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Result = {
  id: string;
  value: string;
  unit: string | null;
  refLow: string | null;
  refHigh: string | null;
  isAbnormal: boolean;
  isCritical: boolean;
  note: string | null;
  performedAt: string | null;
  performedByName: string | null;
};

type LabItem = {
  id: string;
  testCode: string;
  testNameAr: string;
  testNameEn: string;
  unit: string | null;
  sampleType: string;
  status: string;
  result: Result | null;
};

export function LabResultsForm({ item, locale }: { item: LabItem; locale: string }) {
  const t = useTranslations("laboratory");
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_: { ok: boolean; error?: string } | null, formData: FormData) => {
      const res = await saveLabResultAction(item.id, null, formData);
      if (res?.ok) {
        toast.success(t("savedResults"));
        router.refresh();
        return { ok: true };
      }
      return { ok: false, error: res?.error };
    },
    null
  );

  const testName = locale === "ar" ? item.testNameAr : item.testNameEn;
  const isCompleted = item.status === "COMPLETED" || item.status === "REVIEWED";

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <FlaskConical className="size-3.5 text-primary" />
            <span className="font-medium">{item.testCode} — {testName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline">{item.sampleType}</Badge>
            {item.result?.isCritical && <Badge variant="destructive">CRIT</Badge>}
            {item.result?.isAbnormal && !item.result?.isCritical && <Badge variant="warning">{t("abnormal")}</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isCompleted && item.result ? (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">{t("result")}</p>
              <p className={`font-medium ${item.result.isCritical ? "text-destructive" : item.result.isAbnormal ? "text-warning" : ""}`}>
                {item.result.value} {item.result.unit ?? item.unit ?? ""}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("referenceRange")}</p>
              <p className="tabular-nums">{item.result.refLow ?? "—"} — {item.result.refHigh ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Performed by</p>
              <p>{item.result.performedByName ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="tabular-nums">{item.result.performedAt ? new Date(item.result.performedAt).toLocaleDateString() : "—"}</p>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("result")} *</Label>
                <Input name="value" required placeholder={t("result")} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("unit")}</Label>
                <Input name="unit" defaultValue={item.unit ?? ""} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("referenceRange")} (min)</Label>
                <Input name="refLow" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("referenceRange")} (max)</Label>
                <Input name="refHigh" className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" name="isAbnormal" className="size-3 accent-warning" />
                <AlertTriangle className="size-3 text-warning" /> {t("abnormal")}
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" name="isCritical" className="size-3 accent-destructive" />
                <AlertTriangle className="size-3 text-destructive" /> {t("critical")}
              </label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note</Label>
              <Input name="note" className="h-8 text-sm" />
            </div>
            {state && !state.ok && (
              <p className="text-xs text-destructive">{state.error ? t(state.error.replace("laboratory.", "")) : tc("error")}</p>
            )}
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              <CheckCircle2 className="size-3.5" />
              {tc("save")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}