"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setAppointmentStatusAction } from "@/actions/appointments";
import { toast } from "sonner";

const FLOW: Record<string, string[]> = {
  SCHEDULED: ["CONFIRMED", "ARRIVED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["ARRIVED", "WAITING", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["WAITING", "IN_CONSULTATION", "COMPLETED", "NO_SHOW", "CANCELLED"],
  WAITING: ["IN_CONSULTATION", "COMPLETED", "NO_SHOW", "CANCELLED"],
  IN_CONSULTATION: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const STATUS_KEY: Record<string, string> = {
  SCHEDULED: "statusScheduled",
  CONFIRMED: "statusConfirmed",
  ARRIVED: "statusArrived",
  WAITING: "statusWaiting",
  IN_CONSULTATION: "statusInConsultation",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
  NO_SHOW: "statusNoShow",
};

interface ActionSpec {
  label: string;
  variant: "default" | "outline" | "secondary" | "destructive" | "ghost";
}

function actionSpec(status: string): ActionSpec {
  switch (status) {
    case "CONFIRMED":
      return { label: "confirm", variant: "secondary" };
    case "ARRIVED":
      return { label: "checkIn", variant: "default" };
    case "WAITING":
      return { label: "markServed", variant: "default" };
    case "IN_CONSULTATION":
      return { label: "complete", variant: "default" };
    case "CANCELLED":
      return { label: "cancel", variant: "destructive" };
    case "NO_SHOW":
      return { label: "noShow", variant: "destructive" };
    default:
      return { label: "cancel", variant: "outline" };
  }
}

export function AppointmentStatusActions({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: string;
}) {
  const t = useTranslations("appointments");
  const tr = useTranslations("reception");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const next = FLOW[currentStatus] ?? [];

  const act = (status: string) => {
    startTransition(async () => {
      const res = await setAppointmentStatusAction(appointmentId, status, null);
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(tc("error"));
      }
    });
  };

  if (next.length === 0) {
    return (
      <span className="rounded-md border bg-muted/30 px-2.5 py-1 text-sm text-muted-foreground">
        {t(STATUS_KEY[currentStatus] ?? "statusScheduled")}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next.map((status) => {
        const spec = actionSpec(status);
        let label: string;
        if (spec.label === "confirm") label = tc("confirm");
        else if (spec.label === "checkIn") label = t("checkIn");
        else if (spec.label === "noShow") label = t("noShow");
        else if (spec.label === "markServed") label = tr("markServed");
        else if (spec.label === "complete") label = tr("complete");
        else label = t("cancel");
        return (
          <Button
            key={status}
            size="sm"
            variant={spec.variant}
            disabled={isPending}
            onClick={() => act(status)}
            className="gap-1.5"
          >
            {isPending && <Loader2Icon className="size-3.5 animate-spin" />}
            {label}
          </Button>
        );
      })}
    </div>
  );
}