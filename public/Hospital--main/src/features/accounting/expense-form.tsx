"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, WalletMinimal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createExpenseAction } from "@/actions/accounting";
import { type ActionResult } from "@/lib/result";
import { toast } from "sonner";

export type CategoryOption = { id: string; nameAr: string; nameEn: string };
export type PayerOption = { id: string; nameAr: string; nameEn: string };
export type SupplierOption = { id: string; code: string; nameAr: string; nameEn: string };

const METHODS = [
  { value: "CASH", key: "methodCash" },
  { value: "BANK_TRANSFER", key: "methodBankTransfer" },
  { value: "CARD", key: "methodCard" },
  { value: "CHEQUE", key: "methodCheque" },
  { value: "MOBILE_PAYMENT", key: "methodMobilePayment" },
  { value: "INSURANCE", key: "methodInsurance" },
  { value: "OTHER", key: "methodOther" },
] as const;

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function ExpenseForm({
  categories,
  payers,
  suppliers,
  locale,
}: {
  categories: CategoryOption[];
  payers: PayerOption[];
  suppliers: SupplierOption[];
  locale: string;
}) {
  const t = useTranslations("accounting");
  const tp = useTranslations("payments");
  const tb = useTranslations("billing");
  const tph = useTranslations("pharmacy");
  const tc = useTranslations("common");
  const router = useRouter();

  const [categoryId, setCategoryId] = React.useState("none");
  const [method, setMethod] = React.useState("CASH");
  const [paidById, setPaidById] = React.useState("none");
  const [supplierId, setSupplierId] = React.useState("none");
  const [state, action, pending] = useActionState(
    async (_: ActionResult<{ id: string }> | null, formData: FormData) => createExpenseAction(null, formData),
    null
  );

  React.useEffect(() => {
    if (state?.ok) {
      toast.success(tc("saved"));
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error?.startsWith("common.") ? tc(state.error) : tc("error"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  const submit = (formData: FormData) => {
    formData.set("categoryId", categoryId === "none" ? "" : categoryId);
    formData.set("method", method);
    formData.set("paidById", paidById === "none" ? "" : paidById);
    formData.set("supplierId", supplierId === "none" ? "" : supplierId);
    action(formData);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <WalletMinimal className="size-4 text-primary" />
          {t("newExpense")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("expenseCategory")} *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue placeholder={t("expenseCategory")} />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 && <SelectItem value="none" disabled>{t("expenses")}</SelectItem>}
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {locale === "ar" ? c.nameAr : c.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("amount")} (YER) *</Label>
              <Input name="amount" type="number" min="0.01" step="0.01" required className="h-8 text-sm" inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("date")} *</Label>
              <Input name="paidAt" type="date" defaultValue={todayISO()} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tp("method")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue>{tp(METHODS.find((m) => m.value === method)!.key)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {tp(m.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tb("cashier")}</Label>
              <Select value={paidById} onValueChange={setPaidById}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {payers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {locale === "ar" ? p.nameAr : p.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tph("supplier")}</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} · {locale === "ar" ? s.nameAr : s.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tp("reference")}</Label>
            <Input name="reference" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("notes")}</Label>
            <Input name="note" className="h-8 text-sm" />
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? tc(state.error) : tc("error")}</p>
          )}
          <Button type="submit" size="sm" className="gap-1.5" disabled={pending || categoryId === "none"}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : <WalletMinimal className="size-4" />}
            {pending ? tc("saving") : t("newExpense")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}