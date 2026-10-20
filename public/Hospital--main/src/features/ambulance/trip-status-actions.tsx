"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2Icon, MoreHorizontal, Play, Navigation, MapPin, Siren, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateTripStatusAction } from "@/actions/ambulance";

const NEXT: Record<string, Array<{ value: string; icon: typeof Play; labelKey: string; danger?: boolean }>> = {
  DISPATCHED: [
    { value: "EN_ROUTE", icon: Navigation, labelKey: "tripEnRoute" },
    { value: "CANCELLED", icon: XCircle, labelKey: "tripCancelled", danger: true },
  ],
  EN_ROUTE: [
    { value: "ARRIVED", icon: MapPin, labelKey: "tripArrived" },
    { value: "CANCELLED", icon: XCircle, labelKey: "tripCancelled", danger: true },
  ],
  ARRIVED: [
    { value: "TRANSPORTING", icon: Siren, labelKey: "tripTransporting" },
  ],
  TRANSPORTING: [
    { value: "COMPLETED", icon: CheckCircle2, labelKey: "complete" },
  ],
};

export function TripStatusActions({ tripId, status }: { tripId: string; status: string }) {
  const t = useTranslations("ambulance");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const items = NEXT[status] ?? [];

  const run = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateTripStatusAction(tripId, newStatus, null);
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(res?.error?.startsWith("ambulance.") ? t(res.error.replace("ambulance.", "")) : tc("error"));
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