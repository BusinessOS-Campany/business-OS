"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, BanknoteIcon } from "lucide-react";
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
import { recordPaymentAction } from "@/actions/billing";
import { type ActionResult } from "@/lib/result";
import { toast } from "sonner";

const METHODS = [
  { value: "CASH", key: "methodCash" },
  { value: "BANK_TRANSFER", key: "methodBankTransfer" },
  { value: "CARD", key: "methodCard" },
  { value: "CHEQUE", key: "methodCheque" },
  { value: "MOBILE_PAYMENT", key: "methodMobilePayment" },
  { value: "INSURANCE", key: "methodInsurance" },
  { value: "OTHER", key: "methodOther" },
] as const;

export function PaymentForm({ invoiceId, dueAmount, locale }: { invoiceId: string; dueAmount: string; locale: string }) {
  const t = useTranslations("payments");
  const tb = useTranslations("billing");
  const tc = useTranslations("common");
  const router = useRouter();

  const wrapped = React.useCallback(
    (prev: ActionResult | null, formData: FormData) => recordPaymentAction(invoiceId, prev, formData),
    [invoiceId]
  );
  const [state, action, pending] = useActionState(wrapped, null);
  const [method, setMethod] = React.useState("CASH");

  React.useEffect(() => {
    if (state?.ok) {
      toast.success(tc("saved"));
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error?.startsWith("billing.") ? tb(state.error) : tc("error"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  return (
    <form action={(fd) => { fd.set("method", method); action(fd); }} className="space-y-3">
      <input type="hidden" name="method" value={method} />
      <div className="space-y-1.5">
        <Label htmlFor="pay-amount">{tb("amount")} (YER)</Label>
        <Input id="pay-amount" name="amount" type="number" min="0.01" step="0.01" required defaultValue={dueAmount} inputMode="decimal" />
      </div>
      <div className="space-y-1.5">
        <Label>{t("method")}</Label>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-full">
            <SelectValue>{t(METHODS.find((m) => m.value === method)!.key)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{t(m.key)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pay-ref">{t("reference")}</Label>
        <Input id="pay-ref" name="reference" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pay-note">{tc("notes")}</Label>
        <Input id="pay-note" name="note" />
      </div>
      <Button type="submit" className="w-full gap-1.5" disabled={pending}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <BanknoteIcon className="size-4" />}
        {pending ? tc("saving") : t("record")}
      </Button>
    </form>
  );
}