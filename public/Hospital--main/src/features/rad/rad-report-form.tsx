"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition } from "react";
import { Save, ClipboardPen, Lock } from "lucide-react";
import { saveRadReportAction, updateRadOrderStatusAction } from "@/actions/radiology";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Report = {
  id: string;
  findings: string | null;
  impression: string | null;
  attachments: string | null;
  reportedByName: string | null;
  reviewedByName: string | null;
  reportedAt: string | null;
  reviewedAt: string | null;
};

export function RadReportForm({
  orderId,
  status,
  locale,
  report,
}: {
  orderId: string;
  status: string;
  locale: string;
  report: Report | null;
}) {
  const t = useTranslations("radiology");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const locked = status === "REVIEWED" || status === "CANCELLED";

  const [state, formAction, saving] = useActionState(
    async (_: { ok: boolean; error?: string } | null, formData: FormData) => {
      const res = await saveRadReportAction(orderId, null, formData);
      if (res?.ok) {
        toast.success(t("savedReport"));
        router.refresh();
        return { ok: true };
      }
      return { ok: false, error: res?.error };
    },
    null
  );

  const review = () => {
    startTransition(async () => {
      const res = await updateRadOrderStatusAction(orderId, "REVIEWED", null);
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(res?.error?.startsWith("radiology.") ? t(res.error.replace("radiology.", "")) : tc("error"));
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <ClipboardPen className="size-4 text-primary" />
            {t("report")}
          </span>
          <Badge variant="outline">{status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("findings")} *</Label>
            <Textarea name="findings" rows={4} required disabled={locked} defaultValue={report?.findings ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("impression")} *</Label>
            <Textarea name="impression" rows={2} required disabled={locked} defaultValue={report?.impression ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("attachments")}</Label>
            <Input name="attachments" disabled={locked} defaultValue={report?.attachments ?? ""} placeholder="url1, url2" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error.replace("radiology.", "")) : tc("error")}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {!locked && (
              <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                <Save className="size-3.5" /> {t("saveReport")}
              </Button>
            )}
            {status === "REPORTED" && (
              <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={review} className="gap-1.5">
                <Lock className="size-3.5" /> {t("reviewed")}
              </Button>
            )}
          </div>
        </form>

        {report && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {report.reportedByName && <span>{t("reportedBy")}: {report.reportedByName}</span>}
              {report.reportedAt && <span>{new Date(report.reportedAt).toLocaleString()}</span>}
              {report.reviewedByName && <span>{t("reviewedBy")}: {report.reviewedByName}</span>}
              {report.reviewedAt && <span>{new Date(report.reviewedAt).toLocaleString()}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}