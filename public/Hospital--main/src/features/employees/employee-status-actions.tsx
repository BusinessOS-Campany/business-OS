"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2Icon, MoreHorizontal, UserCheck, UserX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { updateEmployeeStatusAction } from "@/actions/employees";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
};

const STATUS_ICON: Record<string, typeof UserCheck> = {
  ACTIVE: UserCheck,
  ON_LEAVE: Clock,
  SUSPENDED: UserX,
  TERMINATED: UserX,
};

export function EmployeeStatusActions({ employeeId, status }: { employeeId: string; status: string }) {
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const options = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"].filter((s) => s !== status);

  const run = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateEmployeeStatusAction(employeeId, newStatus, null, new FormData());
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(tc("error"));
      }
    });
  };

  if (options.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((opt) => {
          const Icon = STATUS_ICON[opt] ?? UserCheck;
          return (
            <DropdownMenuItem key={opt} onClick={() => run(opt)} className={opt === "TERMINATED" ? "text-destructive focus:text-destructive" : undefined}>
              <Icon className="size-4" /> {STATUS_LABEL[opt] ?? opt}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}