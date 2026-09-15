"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleLabTestAction } from "@/actions/laboratory";
import { Button } from "@/components/ui/button";
import { ToggleLeft, ToggleRight, Loader2Icon } from "lucide-react";

export function LabTestToggle({ testId, isActive }: { testId: string; isActive: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const res = await toggleLabTestAction(testId, null, new FormData());
      if (res?.ok) {
        toast.success("Updated");
        router.refresh();
      } else {
        toast.error("Failed");
      }
    });
  };

  return (
    <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={run} title={isActive ? "Deactivate" : "Activate"}>
      {isPending ? <Loader2Icon className="size-5 animate-spin" /> : isActive ? <ToggleRight className="size-5 text-success" /> : <ToggleLeft className="size-5 text-muted-foreground" />}
    </Button>
  );
}