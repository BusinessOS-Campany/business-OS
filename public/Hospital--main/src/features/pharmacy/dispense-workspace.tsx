"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, PackageCheck, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dispensePrescriptionItemAction } from "@/actions/pharmacy";
import { type ActionResult } from "@/lib/result";
import { toast } from "sonner";

export interface DispenseBatch {
  id: string;
  batchNo: string;
  quantity: number;
  expiry: string | null;
}

export interface DispenseItem {
  id: string;
  medicineNameAr: string;
  medicineNameEn: string;
  dosage: string | null;
  frequency: string | null;
  quantity: number;
  dispensedQty: number;
  unit: string | null;
  batches: DispenseBatch[];
}

export function DispenseWorkspace({ items, locale }: { items: DispenseItem[]; locale: string }) {
  const t = useTranslations("pharmacy");
  const tc = useTranslations("common");

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <DispenseRow key={it.id} item={it} locale={locale} />
      ))}
      {items.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("dispensed")}</p>
      )}
    </div>
  );
}

function DispenseRow({ item, locale }: { item: DispenseItem; locale: string }) {
  const t = useTranslations("pharmacy");
  const tc = useTranslations("common");
  const router = useRouter();

  const available = item.batches.reduce((s, b) => s + b.quantity, 0);
  const remaining = item.quantity - item.dispensedQty;
  const isDone = remaining <= 0;

  const wrapped = React.useCallback(
    (prev: ActionResult | null, formData: FormData) =>
      dispensePrescriptionItemAction(item.id, prev, formData),
    [item.id]
  );
  const [state, action, pending] = useActionState(wrapped, null);

  const [batchId, setBatchId] = React.useState<string>(item.batches[0]?.id ?? "");
  const [qty, setQty] = React.useState<string>(String(remaining > 0 ? remaining : 1));

  React.useEffect(() => {
    if (state?.ok) {
      toast.success(tc("saved"));
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(
        state.error?.startsWith("pharmacy.") ? t(state.error.replace("pharmacy.", "")) : tc("error")
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  const name = locale === "ar" ? item.medicineNameAr : item.medicineNameEn;
  const stockOk = item.batches.length > 0 && available > 0;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {name}
            {isDone ? (
              <Badge variant="success" className="gap-1">
                <BadgeCheck className="size-3" />
                {t("dispensed")}
              </Badge>
            ) : (
              <Badge variant="info">{t("pendingDispense")}</Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {[item.dosage, item.frequency].filter(Boolean).join(" · ") || "—"} ·{" "}
            {t("quantity")}: {item.quantity} {item.unit ?? ""} · {t("dispensed")}: {item.dispensedQty}
          </p>
        </div>
        <div className="text-end text-xs text-muted-foreground">
          {t("stock")}:
          <span className="ms-1 font-semibold text-foreground tabular-nums">{available}</span>
        </div>
      </div>

      {!isDone && (
        <form
          action={(fd) => {
            fd.set("dispensedQty", qty);
            fd.set("batchId", batchId);
            action(fd);
          }}
          className="mt-3 grid grid-cols-1 items-end gap-2 sm:grid-cols-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label>{t("selectBatch")}</Label>
            {stockOk ? (
              <>
                <Select value={batchId} onValueChange={setBatchId}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {item.batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.batchNo} · {b.quantity} · {b.expiry ? b.expiry.slice(0, 10) : "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <p className="rounded-md border bg-muted px-2 py-2 text-xs text-muted-foreground">
                {t("noStock")}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`qty-${item.id}`}>{t("dispenseQty")}</Label>
            <Input
              id={`qty-${item.id}`}
              type="number"
              min="1"
              max={Math.min(remaining, available)}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={pending || !stockOk} className="gap-1.5">
            {pending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <PackageCheck className="size-3.5" />
            )}
            {pending ? tc("saving") : `${t("dispense")} ${qty || ""}`.trim()}
          </Button>
        </form>
      )}
    </div>
  );
}