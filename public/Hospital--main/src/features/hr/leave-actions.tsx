"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2Icon, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { decideLeaveAction } from "@/actions/hr";

export function LeaveActions({ leaveId, status }: { leaveId: string; status: string }) {
  const t = useTranslations();
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const decide = (decision: string) => {
    startTransition(async () => {
      const res = await decideLeaveAction(leaveId, decision, null, new FormData());
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(tc("error"));
      }
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="icon-sm" disabled={isPending || status !== "PENDING"} onClick={() => decide("APPROVED")} title={t("hr.approve")}>
        {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      </Button>
      <Button variant="outline" size="icon-sm" disabled={isPending || status !== "PENDING"} onClick={() => decide("REJECTED")} title={t("hr.reject")} className="text-destructive hover:text-destructive">
        <X className="size-3.5" />
      </Button>
    </div>
  );
}