"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Loader2Icon,
  Send,
  CheckCircle2,
  PackageCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { updatePurchaseOrderStatusAction } from "@/actions/pharmacy";
import { toast } from "sonner";

export function PoStatusActions({ poId, status }: { poId: string; status: string }) {
  const t = useTranslations("pharmacy");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (actionLabel: string, newStatus: string) => {
    startTransition(async () => {
      const res = await updatePurchaseOrderStatusAction(poId, newStatus, null);
      if (res?.ok) {
        toast.success(
          newStatus === "RECEIVED" ? t("receive") : tc("updated")
        );
        router.refresh();
      } else {
        toast.error(
          res?.error?.startsWith("pharmacy.") ? t(res.error.replace("pharmacy.", "")) : tc("error")
        );
      }
    });
  };

  const canSend = status === "DRAFT";
  const canApprove = status === "SUBMITTED";
  const canReceive = status === "APPROVED" || status === "PARTIALLY_RECEIVED";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {canSend && (
          <DropdownMenuItem onClick={() => run("submit", "SUBMITTED")}>
            <Send className="size-4" /> {t("submit")}
          </DropdownMenuItem>
        )}
        {canApprove && (
          <DropdownMenuItem onClick={() => run("approve", "APPROVED")}>
            <CheckCircle2 className="size-4" /> {t("approve")}
          </DropdownMenuItem>
        )}
        {canReceive && (
          <DropdownMenuItem onClick={() => run("receive", "RECEIVED")}>
            <PackageCheck className="size-4" /> {t("receiveAll")}
          </DropdownMenuItem>
        )}
        {(status === "DRAFT" || status === "SUBMITTED") && (
          <DropdownMenuItem
            onClick={() => run("cancel", "CANCELLED")}
            className="text-destructive focus:text-destructive"
          >
            <XCircle className="size-4" /> {t("cancel")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}