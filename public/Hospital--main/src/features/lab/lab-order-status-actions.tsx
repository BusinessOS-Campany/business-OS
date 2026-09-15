"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, MoreHorizontal, CheckCircle2, Package, Play, CheckSquare, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateLabOrderStatusAction } from "@/actions/laboratory";
import { toast } from "sonner";

export function LabOrderStatusActions({ orderId, status }: { orderId: string; status: string }) {
  const t = useTranslations("laboratory");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateLabOrderStatusAction(orderId, newStatus, null);
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(res?.error?.startsWith("laboratory.") ? t(res.error.replace("laboratory.", "")) : tc("error"));
      }
    });
  };

  const actions: Array<{ status: string; icon: typeof CheckCircle2; labelKey: string; className?: string }> = [];

  if (status === "ORDERED") actions.push({ status: "COLLECTED", icon: Package, labelKey: "collect" });
  if (status === "COLLECTED") actions.push({ status: "RECEIVED", icon: Package, labelKey: "receive" });
  if (status === "RECEIVED") actions.push({ status: "PROCESSING", icon: Play, labelKey: "process" });
  if (status === "PROCESSING") actions.push({ status: "COMPLETED", icon: CheckCircle2, labelKey: "verify" });
  if (status === "COMPLETED") actions.push({ status: "REVIEWED", icon: CheckSquare, labelKey: "verify" });
  if (!["COMPLETED", "REVIEWED", "CANCELLED"].includes(status)) {
    actions.push({ status: "CANCELLED", icon: XCircle, labelKey: "cancel", className: "text-destructive focus:text-destructive" });
  }

  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {actions.map((a) => (
          <DropdownMenuItem key={a.status} onClick={() => run(a.status)} className={a.className}>
            <a.icon className="size-4" /> {t(a.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}