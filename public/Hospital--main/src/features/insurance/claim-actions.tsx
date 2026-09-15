"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BadgeCheck, CheckCircle2, Eye, Loader2Icon, Percent, Send, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { submitClaimAction, sendToReviewAction, decideClaimAction, markClaimPaidAction } from "@/actions/insurance";
import { STATUS_VARIANT, STATUS_LABEL, statusVariant, statusLabel } from "@/lib/insurance-statuses";

export function ClaimStatusBadge({ status }: { status: string }) {
  const t = useTranslations();
  return <Badge variant={statusVariant(status)}>{t(statusLabel(status))}</Badge>;
}

export function ClaimStatusActions({ claimId, status, approvedAmount }: {
  claimId: string;
  status: string;
  approvedAmount: number | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(approvedAmount ?? ""));
  const lastError = useRef("");

  const run = (action: (prev: unknown) => Promise<{ ok?: boolean; error?: string } | null>) => {
    startTransition(async () => {
      const res = await action(undefined);
      if (res?.ok) {
        toast.success(t("common.updated"));
        router.refresh();
      } else {
        const key = res?.error ?? "common.error";
        lastError.current = key;
        toast.error(key.startsWith("common.") || key.startsWith("insurance.") ? t(key) : t("common.error"));
      }
    });
  };

  const confirmPartial = () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setOpen(false);
    const fd = new FormData();
    fd.set("approvedAmount", String(amt));
    run(() => decideClaimAction(claimId, "PARTIALLY_APPROVED", null, fd));
  };

  const button = (labelKey: string, onClick: () => void, Icon: typeof Send, variant: "outline" | "default" = "outline") => (
    <Button key={labelKey} size="sm" variant={variant} className="gap-1.5" disabled={isPending} onClick={onClick} type="button">
      <Icon className="size-4" />
      {t(labelKey)}
    </Button>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === "DRAFT" ? button("insurance.submit", () => run(() => submitClaimAction(claimId, null, new FormData())), Send) : null}
        {status === "SUBMITTED" ? button("insurance.inReview", () => run(() => sendToReviewAction(claimId, null, new FormData())), Eye) : null}
        {status === "SUBMITTED" || status === "IN_REVIEW" ? (
          <>
            {button("insurance.approve", () => run(() => decideClaimAction(claimId, "APPROVED", null, new FormData())), CheckCircle2)}
            {button("insurance.approvePartial", () => setOpen(true), Percent)}
            {button("insurance.reject", () => run(() => decideClaimAction(claimId, "REJECTED", null, new FormData())), XCircle)}
          </>
        ) : null}
        {status === "APPROVED" || status === "PARTIALLY_APPROVED" ? (
          button("insurance.markPaid", () => run(() => markClaimPaidAction(claimId, null, new FormData())), BadgeCheck, "default")
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{t("insurance.approvePartial")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">{t("insurance.approvedAmount")}</Label>
            <Input type="number" className="h-8 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button size="sm" onClick={confirmPartial}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isPending && <p className="text-muted-foreground flex items-center gap-2 text-xs"><Loader2Icon className="size-3 animate-spin" /> {t("common.loading")}</p>}
    </>
  );
}