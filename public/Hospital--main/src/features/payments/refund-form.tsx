"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, Undo2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createRefundAction } from "@/actions/payments";
import { type ActionResult } from "@/lib/result";
import { toast } from "sonner";

export function RefundForm({ paymentId, maxAmount }: { paymentId: string; maxAmount: string }) {
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const router = useRouter();

  const wrapped = React.useCallback(
    (prev: ActionResult | null, formData: FormData) => createRefundAction(paymentId, prev, formData),
    [paymentId]
  );
  const [state, action, pending] = useActionState(wrapped, null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success(tc("saved"));
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error?.startsWith("common.") ? tc(state.error) : tc("error"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="refund-amount">{tc("amount")} (YER) *</Label>
        <Input id="refund-amount" name="amount" type="number" min="0.01" max={maxAmount} step="0.01" required inputMode="decimal" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="refund-reason">{t("refundReason")}</Label>
        <Textarea id="refund-reason" name="reason" rows={2} className="text-sm" />
      </div>
      <Button type="submit" variant="destructive" size="sm" className="w-full gap-1.5" disabled={pending}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <Undo2Icon className="size-4" />}
        {pending ? tc("saving") : t("refund")}
      </Button>
    </form>
  );
}