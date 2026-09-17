"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2Icon, MoreHorizontal, Power, PowerOff, Wrench, Archive, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateAssetStatusAction } from "@/actions/assets";

const NEXT: Record<string, Array<{ value: string; icon: typeof Power; labelKey: string; danger?: boolean }>> = {
  ACTIVE: [
    { value: "UNDER_MAINTENANCE", icon: Wrench, labelKey: "statusUnderMaintenance" },
    { value: "INACTIVE", icon: PowerOff, labelKey: "statusInactive" },
    { value: "RETIRED", icon: Archive, labelKey: "statusRetired" },
    { value: "LOST", icon: XCircle, labelKey: "statusLost", danger: true },
  ],
  INACTIVE: [
    { value: "ACTIVE", icon: Power, labelKey: "statusActive" },
    { value: "UNDER_MAINTENANCE", icon: Wrench, labelKey: "statusUnderMaintenance" },
    { value: "RETIRED", icon: Archive, labelKey: "statusRetired" },
    { value: "LOST", icon: XCircle, labelKey: "statusLost", danger: true },
  ],
  UNDER_MAINTENANCE: [
    { value: "ACTIVE", icon: Power, labelKey: "statusActive" },
    { value: "INACTIVE", icon: PowerOff, labelKey: "statusInactive" },
    { value: "RETIRED", icon: Archive, labelKey: "statusRetired" },
    { value: "LOST", icon: XCircle, labelKey: "statusLost", danger: true },
  ],
  RETIRED: [
    { value: "ACTIVE", icon: Power, labelKey: "statusActive" },
    { value: "INACTIVE", icon: PowerOff, labelKey: "statusInactive" },
  ],
  LOST: [
    { value: "ACTIVE", icon: Power, labelKey: "statusActive" },
    { value: "INACTIVE", icon: PowerOff, labelKey: "statusInactive" },
  ],
};

export function AssetStatusActions({ assetId, status }: { assetId: string; status: string }) {
  const t = useTranslations("assets");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const items = NEXT[status] ?? [];

  const run = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateAssetStatusAction(assetId, newStatus, null, new FormData());
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(res?.error?.startsWith("assets.") ? t(res.error.replace("assets.", "")) : tc("error"));
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