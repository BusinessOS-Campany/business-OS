"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2Icon, MoreHorizontal, CheckCircle2, Lock, Bot, Hash, PackageCheck, RotateCcw, Trash2, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateBloodUnitStatusAction } from "@/actions/blood-bank";

const NEXT: Record<string, Array<{ value: string; icon: typeof Lock; labelKey: string; danger?: boolean }>> = {
  QUARANTINED: [
    { value: "AVAILABLE", icon: CheckCircle2, labelKey: "statusAvailable" },
    { value: "EXPIRED", icon: TimerOff, labelKey: "statusExpired" },
    { value: "WASTED", icon: Trash2, labelKey: "statusWasted", danger: true },
  ],
  AVAILABLE: [
    { value: "RESERVED", icon: Lock, labelKey: "reserve" },
    { value: "CROSSMATCHED", icon: Bot, labelKey: "crossmatch" },
    { value: "EXPIRED", icon: TimerOff, labelKey: "statusExpired" },
    { value: "WASTED", icon: Trash2, labelKey: "statusWasted", danger: true },
  ],
  RESERVED: [
    { value: "ISSUED", icon: PackageCheck, labelKey: "issue" },
    { value: "AVAILABLE", icon: RotateCcw, labelKey: "release" },
    { value: "WASTED", icon: Trash2, labelKey: "statusWasted", danger: true },
  ],
  CROSSMATCHED: [
    { value: "ISSUED", icon: PackageCheck, labelKey: "issue" },
    { value: "AVAILABLE", icon: RotateCcw, labelKey: "release" },
  ],
  ISSUED: [{ value: "RETURNED", icon: RotateCcw, labelKey: "statusReturned" }],
  EXPIRED: [{ value: "WASTED", icon: Trash2, labelKey: "statusWasted", danger: true }],
};

export function BloodUnitStatusActions({ unitId, status }: { unitId: string; status: string }) {
  const t = useTranslations("bloodbank");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const items = NEXT[status] ?? [];

  const run = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateBloodUnitStatusAction(unitId, newStatus, null, new FormData());
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(res?.error?.startsWith("bloodbank.") ? t(res.error.replace("bloodbank.", "")) : tc("error"));
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