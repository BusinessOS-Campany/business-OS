"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2Icon, MoreHorizontal, CalendarClock, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateMaintenanceStatusAction } from "@/actions/maintenance";

const NEXT: Record<string, Array<{ value: string; icon: typeof Play; labelKey: string; danger?: boolean }>> = {
  REQUESTED: [
    { value: "SCHEDULED", icon: CalendarClock, labelKey: "sched" },
    { value: "CANCELLED", icon: XCircle, labelKey: "statusCancelled", danger: true },
  ],
  SCHEDULED: [
    { value: "IN_PROGRESS", icon: Play, labelKey: "statusInProgress" },
    { value: "CANCELLED", icon: XCircle, labelKey: "statusCancelled", danger: true },
  ],
  IN_PROGRESS: [
    { value: "CANCELLED", icon: XCircle, labelKey: "statusCancelled", danger: true },
  ],
};

export function MaintenanceStatusActions({ requestId, status }: { requestId: string; status: string }) {
  const t = useTranslations("maintenance");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const items = NEXT[status] ?? [];

  const run = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateMaintenanceStatusAction(requestId, newStatus);
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(res?.error?.startsWith("maintenance.") ? t(res.error.replace("maintenance.", "")) : tc("error"));
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