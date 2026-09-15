"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2Icon, MoreHorizontal, ClipboardList, Play, CheckCircle2, HeartPulse, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateSurgeryStatusAction } from "@/actions/surgery";

const NEXT: Record<string, Array<{ value: string; icon: typeof Play; labelKey: string; danger?: boolean }>> = {
  SCHEDULED: [
    { value: "PRE_OP", icon: ClipboardList, labelKey: "statusPreOp" },
    { value: "IN_PROGRESS", icon: Play, labelKey: "statusInProgress" },
    { value: "CANCELLED", icon: XCircle, labelKey: "statusCancelled", danger: true },
  ],
  PRE_OP: [
    { value: "IN_PROGRESS", icon: Play, labelKey: "statusInProgress" },
    { value: "CANCELLED", icon: XCircle, labelKey: "statusCancelled", danger: true },
  ],
  IN_PROGRESS: [
    { value: "COMPLETED", icon: CheckCircle2, labelKey: "statusCompleted" },
    { value: "POST_OP", icon: HeartPulse, labelKey: "statusPostOp" },
    { value: "CANCELLED", icon: XCircle, labelKey: "statusCancelled", danger: true },
  ],
  POST_OP: [
    { value: "COMPLETED", icon: CheckCircle2, labelKey: "statusCompleted" },
    { value: "IN_PROGRESS", icon: Play, labelKey: "statusInProgress" },
  ],
  COMPLETED: [{ value: "POST_OP", icon: HeartPulse, labelKey: "statusPostOp" }],
};

export function SurgeryStatusActions({ surgeryId, status }: { surgeryId: string; status: string }) {
  const t = useTranslations("surgery");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const items = NEXT[status] ?? [];

  const run = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateSurgeryStatusAction(surgeryId, newStatus, null, new FormData());
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(res?.error?.startsWith("surgery.") ? t(res.error.replace("surgery.", "")) : tc("error"));
      }
    });
  };

  if (items.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => run(item.value)}
            className={item.danger ? "text-destructive focus:text-destructive" : undefined}
          >
            <item.icon className="size-4" /> {t(item.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}