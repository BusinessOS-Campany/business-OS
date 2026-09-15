"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, PlusIcon, Trash2Icon, SaveIcon, CalculatorIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPurchaseOrderAction } from "@/actions/pharmacy";
import { type ActionResult } from "@/lib/result";
import { toast } from "sonner";

export interface PoSupplier {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface PoWarehouse {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface PoItemOption {
  id: string;
  nameAr: string;
  nameEn: string;
  unit: string;
}

interface Line {
  key: number;
  itemId: string;
  quantity: string;
  unitPrice: string;
  batchNo: string;
  expiryDate: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function PoForm({
  suppliers,
  warehouses,
  items,
  locale,
}: {
  suppliers: PoSupplier[];
  warehouses: PoWarehouse[];
  items: PoItemOption[];
  locale: string;
}) {
  const t = useTranslations("pharmacy");
  const tc = useTranslations("common");
  const router = useRouter();

  const [state, action, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    createPurchaseOrderAction,
    null
  );
  const [isPending, startTransition] = useTransition();

  const [supplierId, setSupplierId] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([
    { key: 1, itemId: "", quantity: "1", unitPrice: "", batchNo: "", expiryDate: "" },
  ]);

  React.useEffect(() => {
    if (state?.ok && state.data?.id) {
      toast.success(tc("saved"));
      router.push(`/procurement/${state.data.id}`);
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(
        state.error?.startsWith("pharmacy.") ? t(state.error.replace("pharmacy.", "")) : tc("error")
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  const nameOf = (a: string, b: string) => (locale === "ar" ? a : b);

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((all) => all.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const total = round2(
    lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0)
  );

  const busy = pending || isPending;

  return (
    <form
      action={(fd) => {
        fd.set("supplierId", supplierId);
        if (warehouseId) fd.set("warehouseId", warehouseId);
        fd.set(
          "items",
          JSON.stringify(
            lines
              .filter((l) => l.itemId)
              .map((l) => ({
                itemId: l.itemId,
                quantity: Number(l.quantity) || 1,
                unitPrice: Number(l.unitPrice) || 0,
                batchNo: l.batchNo,
                expiryDate: l.expiryDate || undefined,
              }))
          )
        );
        action(fd);
      }}
      className="space-y-5"
    >
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>{t("selectSupplier")}</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectSupplier")} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{nameOf(s.nameAr, s.nameEn)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("selectWarehouse")}</Label>
            {warehouses.length > 0 ? (
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectWarehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{nameOf(w.nameAr, w.nameEn)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="rounded-md border px-3 py-2 text-xs text-muted-foreground">—</p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="po-note">{t("notes")}</Label>
            <Textarea id="po-note" name="note" rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("addItem")}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() =>
                setLines((all) => [
                  ...all,
                  { key: Date.now(), itemId: "", quantity: "1", unitPrice: "", batchNo: "", expiryDate: "" },
                ])
              }
            >
              <PlusIcon className="size-3.5" />
              {tc("add")}
            </Button>
          </div>

          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.key} className="rounded-md border p-2">
                <div className="grid grid-cols-[1fr_5rem_6rem_1fr] gap-2 max-sm:grid-cols-1">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">{t("itemName")}</Label>
                    <Select value={line.itemId} onValueChange={(v) => setLine(line.key, { itemId: v })}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((it) => (
                          <SelectItem key={it.id} value={it.id}>
                            {nameOf(it.nameAr, it.nameEn)} {it.unit ? `(${it.unit})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">{t("quantity")}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">{t("unitPrice")} (YER)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => setLine(line.key, { unitPrice: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={lines.length === 1}
                      onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">{t("batchNo")}</Label>
                    <Input
                      value={line.batchNo}
                      onChange={(e) => setLine(line.key, { batchNo: e.target.value })}
                      placeholder="—"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">{t("expiryDate")}</Label>
                    <Input
                      type="date"
                      value={line.expiryDate}
                      onChange={(e) => setLine(line.key, { expiryDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t pt-3 text-sm font-semibold">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CalculatorIcon className="size-4" />
              {t("total")}
            </span>
            <span className="ms-2 tabular-nums">{total.toLocaleString(locale === "ar" ? "ar-YE" : "en-US")} YER</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={busy || !supplierId} className="gap-2">
          {busy ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          {busy ? tc("saving") : tc("create")}
        </Button>
      </div>
    </form>
  );
}