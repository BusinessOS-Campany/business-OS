"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adjustStockAction } from "@/actions/pharmacy";
import { type ActionResult } from "@/lib/result";
import { toast } from "sonner";

export interface BatchOption {
  id: string;
  batchNo: string;
  quantity: number;
  expiry: string | null;
  warehouseName: string;
}

export function AdjustStockForm({
  itemId,
  batches,
  warehouses,
  locale,
}: {
  itemId: string;
  batches: BatchOption[];
  warehouses: { id: string; nameAr: string; nameEn: string }[];
  locale: string;
}) {
  const t = useTranslations("pharmacy");
  const tc = useTranslations("common");
  const router = useRouter();

  const [state, action, pending] = useActionState<ActionResult | null, FormData>(adjustStockAction, null);
  const [mode, setMode] = React.useState<"batch" | "new">(batches.length > 0 ? "batch" : "new");
  const [batchId, setBatchId] = React.useState<string>(batches[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = React.useState<string>(warehouses[0]?.id ?? "");

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

  const nameOf = (w: { nameAr: string; nameEn: string }) => (locale === "ar" ? w.nameAr : w.nameEn);

  return (
    <form
      action={(fd) => {
        fd.set("itemId", itemId);
        if (mode === "batch" && batchId) fd.set("batchId", batchId);
        if (mode === "new" && warehouseId) fd.set("warehouseId", warehouseId);
        action(fd);
      }}
      className="space-y-3"
    >
      <div className="flex flex-col gap-2">
        <Label>{t("adjustment")}</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as "batch" | "new")}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {mode === "batch" ? `${t("adjust")} (${t("batch")})` : t("newItem")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="batch" disabled={batches.length === 0}>
              {t("adjust")} ({t("batch")})
            </SelectItem>
            <SelectItem value="new">{t("addStock")} · {t("newItem")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "batch" ? (
        <div className="flex flex-col gap-2">
          <Label>{t("selectBatch")}</Label>
          <Select value={batchId} onValueChange={setBatchId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.batchNo} · {t("stock")}: {b.quantity}
                  {b.warehouseName ? ` · ${b.warehouseName}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-batch">{t("batchNo")}</Label>
            <Input id="new-batch" name="batchNo" placeholder={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-expiry">{t("expiryDate")}</Label>
            <Input id="new-expiry" name="expiryDate" type="date" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>{t("warehouses")}</Label>
            {warehouses.length > 0 ? (
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{nameOf(w)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="qty">{t("quantity")}</Label>
        <Input
          id="qty"
          name="quantity"
          type="number"
          step="1"
          required
          placeholder={mode === "batch" ? "-5 / +10" : "100"}
        />
        <p className="text-xs text-muted-foreground">
          {mode === "batch" ? t("removeStock") : t("addStock")}
        </p>
      </div>

      <Button type="submit" disabled={pending} className="w-full gap-2">
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <ArrowUpDown className="size-4" />}
        {pending ? tc("saving") : t("adjustStock")}
      </Button>
    </form>
  );
}