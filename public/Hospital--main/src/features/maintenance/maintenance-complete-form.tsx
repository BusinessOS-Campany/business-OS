"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, Loader2Icon } from "lucide-react";
import { updateMaintenanceStatusAction } from "@/actions/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MaintenanceCompleteForm({ requestId }: { requestId: string }) {
  const t = useTranslations("maintenance");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cost, setCost] = useState("");
  const [spareParts, setSpareParts] = useState("");
  const [note, setNote] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateMaintenanceStatusAction(requestId, "COMPLETED", {
        cost: cost.trim() || undefined,
        spareParts: spareParts.trim() || undefined,
        note: note.trim() || undefined,
      });
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(res?.error?.startsWith("maintenance.") ? t(res.error.replace("maintenance.", "")) : tc("error"));
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="size-4 text-primary" />
          {t("complete")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("cost")}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              className="h-8 text-sm"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("spareParts")}</Label>
            <Textarea rows={2} className="text-sm" value={spareParts} onChange={(e) => setSpareParts(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("notes")}</Label>
            <Textarea rows={2} className="text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {isPending ? tc("saving") : t("complete")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}