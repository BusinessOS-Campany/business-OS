"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Check, Banknote } from "lucide-react";
import {
  generatePayrollRunAction,
  approvePayrollRunAction,
  markPayrollRunPaidAction,
} from "@/actions/payroll";
import { Button } from "@/components/ui/button";

export function GenerateRunButton({ periodId }: { periodId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await generatePayrollRunAction(periodId);
          if (res.ok) {
            toast.success(t("common.saved"));
            router.refresh();
          } else {
            toast.error(t(res.error));
          }
        })
      }
    >
      <Play className="size-3.5" />
      {t("payroll.run")}
    </Button>
  );
}

export function RunActions({ runId, status }: { runId: string; status: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(t(msg));
        router.refresh();
      } else {
        toast.error(t(res.error ?? "common.error"));
      }
    });

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <Button
          size="sm"
          className="gap-1.5"
          disabled={pending}
          onClick={() => run(() => approvePayrollRunAction(runId), "common.updated")}
        >
          <Check className="size-3.5" />
          {t("payroll.approve")}
        </Button>
      )}
      {status === "APPROVED" && (
        <Button
          size="sm"
          variant="success"
          className="gap-1.5"
          disabled={pending}
          onClick={() => run(() => markPayrollRunPaidAction(runId), "common.updated")}
        >
          <Banknote className="size-3.5" />
          {t("payroll.markPaid")}
        </Button>
      )}
    </div>
  );
}
