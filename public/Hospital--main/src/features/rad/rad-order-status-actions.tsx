"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, MoreHorizontal, CalendarClock, Activity, CheckSquare, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateRadOrderStatusAction } from "@/actions/radiology";
import { toast } from "sonner";

export function RadOrderStatusActions({ orderId, status }: { orderId: string; status: string }) {
  const t = useTranslations("radiology");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateRadOrderStatusAction(orderId, newStatus, null);
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(res?.error?.startsWith("radiology.") ? t(res.error.replace("radiology.", "")) : tc("error"));
      }
    });
  };

  const actions: Array<{ status: string; icon: typeof CalendarClock; labelKey: string; className?: string }> = [];

  if (status === "ORDERED") actions.push({ status: "SCHEDULED", icon: CalendarClock, labelKey: "schedule" });
  if (status === "SCHEDULED") actions.push({ status: "PERFORMED", icon: Activity, labelKey: "performed" });
  if (status === "REPORTED") actions.push({ status: "REVIEWED", icon: CheckSquare, labelKey: "reviewed" });
  if (!["REPORTED", "REVIEWED", "CANCELLED"].includes(status)) {
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