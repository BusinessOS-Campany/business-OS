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
import { createInvoiceAction } from "@/actions/billing";
import { toast } from "sonner";
import { PatientPicker, type PickerPatient } from "@/features/shared/patient-picker";

interface ServiceDatum {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: string;
  price: string;
}

interface ItemDatum {
  key: number;
  serviceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function InvoiceForm({
  patients,
  services,
  locale,
}: {
  patients: PickerPatient[];
  services: ServiceDatum[];
  locale: string;
}) {
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const router = useRouter();

  const [state, action, pending] = useActionState(createInvoiceAction, null);
  const [isPending, startTransition] = useTransition();

  const [patientId, setPatientId] = React.useState("");
  const [discountType, setDiscountType] = React.useState("none");
  const [discountValue, setDiscountValue] = React.useState("0");
  const [taxRate, setTaxRate] = React.useState("0");
  const [items, setItems] = React.useState<ItemDatum[]>([
    { key: 1, serviceId: "", description: "", quantity: "1", unitPrice: "", discount: "0" },
  ]);

  const nameOf = (p: { nameAr: string; nameEn: string }) => (locale === "ar" ? p.nameAr : p.nameEn);

  const submit = (formData: FormData) => {
    formData.set("patientId", patientId);
    formData.set("discountType", discountType === "none" ? "" : discountType);
    formData.set("discountValue", discountValue);
    formData.set("taxRate", taxRate);
    const payload = items.map((it) => ({
      serviceId: it.serviceId || null,
      description: it.description || nameOf(services.find((s) => s.id === it.serviceId) ?? { nameAr: "", nameEn: "" }),
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      discount: Number(it.discount) || 0,
    }));
    formData.set("items", JSON.stringify(payload));
  };

  React.useEffect(() => {
    if (state?.ok && state.data?.id) {
      toast.success(t("title") + " ✓");
      router.push(`/billing/${state.data.id}`);
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(tc("error"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  const applyService = (key: number, serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    setItems((all) =>
      all.map((it) =>
        it.key === key
          ? { ...it, serviceId, unitPrice: svc ? svc.price : it.unitPrice, description: svc ? "" : it.description }
          : it
      )
    );
  };

  const subtotal = round2(
    items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0)
  );
  const itemDiscount = round2(items.reduce((s, it) => s + (Number(it.discount) || 0), 0));
  const base =
    items.length === 1
      ? round2((Number(items[0].quantity) || 0) * (Number(items[0].unitPrice) || 0) - itemDiscount)
      : subtotal;
  const discountAmount =
    discountType === "percentage"
      ? round2((base * Number(discountValue || 0)) / 100)
      : discountType === "fixed"
        ? Math.min(base, Number(discountValue || 0))
        : 0;
  const totalDiscount = round2(itemDiscount + discountAmount);
  const taxAmount = round2(((base - discountAmount) * Number(taxRate || 0)) / 100);
  const total = round2(base - discountAmount + taxAmount);

  const fmt = (n: number) => n.toLocaleString(locale === "ar" ? "ar-YE" : "en-US", { maximumFractionDigits: 2 });

  const busy = pending || isPending;

  return (
    <form action={(fd) => { submit(fd); action(fd); }} className="space-y-5">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <PatientPicker patients={patients} selectedId={patientId} onSelect={setPatientId} label={t("selectPatient")} locale={locale} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("discountType")}</Label>
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={discountType} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="percentage">{t("discountPercentage")}</SelectItem>
                <SelectItem value="fixed">{t("discountFixed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="discountValue">{discountType === "fixed" ? t("discountFixed") : "%"}</Label>
            <Input id="discountValue" name="discountValue" type="number" min="0" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="taxRate">{t("taxRate")} (%)</Label>
            <Input id="taxRate" name="taxRate" type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
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
                setItems((all) => [...all, { key: Date.now(), serviceId: "", description: "", quantity: "1", unitPrice: "", discount: "0" }])
              }
            >
              <PlusIcon className="size-3.5" />
              {tc("add")}
            </Button>
          </div>

          <div className="grid grid-cols-[1fr_2fr_5rem_6rem_5rem_2.5rem] gap-2 max-sm:grid-cols-2">
            <p className="hidden text-xs text-muted-foreground sm:block">{t("type")}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">{t("selectService")}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">{t("qty")}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">{t("unitPrice")}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">{t("discountAmount")}</p>
            <span className="hidden sm:block" />
          </div>

          {items.map((it) => (
            <div key={it.key} className="grid grid-cols-[1fr_2fr_5rem_6rem_5rem_2.5rem] items-center gap-2 max-sm:grid-cols-2">
              <select
                aria-label={t("type")}
                className="rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={it.serviceId ? "SERVICE" : "SERVICE"}
              >
                <option value="SERVICE">{t("services")}</option>
              </select>
              <div className="flex items-center gap-1.5">
                {services.length > 0 ? (
                  <Select value={it.serviceId} onValueChange={(v) => applyService(it.key, v)}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {nameOf(s)} · {fmt(Number(s.price))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                <Input
                  placeholder={t("itemDescription")}
                  value={it.description}
                  onChange={(e) => setItems((all) => all.map((x) => (x.key === it.key ? { ...x, description: e.target.value } : x)))}
                  className="text-sm"
                />
              </div>
              <Input
                type="number"
                min="1"
                value={it.quantity}
                onChange={(e) => setItems((all) => all.map((x) => (x.key === it.key ? { ...x, quantity: e.target.value } : x)))}
                className="text-sm"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={it.unitPrice}
                onChange={(e) => setItems((all) => all.map((x) => (x.key === it.key ? { ...x, unitPrice: e.target.value } : x)))}
                className="text-sm"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={it.discount}
                onChange={(e) => setItems((all) => all.map((x) => (x.key === it.key ? { ...x, discount: e.target.value } : x)))}
                className="text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1.5 text-destructive"
                disabled={items.length === 1}
                onClick={() => setItems((all) => all.filter((x) => x.key !== it.key))}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          ))}

          <div className="flex flex-col items-end gap-1 border-t pt-3 text-sm">
            <div className="flex w-full max-w-xs items-center justify-between">
              <span className="text-muted-foreground">{t("subtotal")}</span>
              <span className="tabular-nums">{fmt(subtotal)} YER</span>
            </div>
            <div className="flex w-full max-w-xs items-center justify-between">
              <span className="text-muted-foreground">{t("discountAmount")}</span>
              <span className="tabular-nums">−{fmt(totalDiscount)} YER</span>
            </div>
            <div className="flex w-full max-w-xs items-center justify-between">
              <span className="text-muted-foreground">{t("tax")}</span>
              <span className="tabular-nums">{fmt(taxAmount)} YER</span>
            </div>
            <div className="flex w-full max-w-xs items-center justify-between border-t pt-1 text-base font-semibold">
              <span className="flex items-center gap-1.5">
                <CalculatorIcon className="size-4" />
                {t("grandTotal")}
              </span>
              <span className="tabular-nums">{fmt(total)} YER</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">{tc("notes")}</Label>
            <Textarea id="note" name="note" rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={busy || !patientId} className="gap-2">
          {busy ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          {busy ? tc("saving") : t("issue")}
        </Button>
      </div>
    </form>
  );
}