"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setTriageAction } from "@/actions/emergency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRIAGE_LEVELS } from "@/lib/services/emergency";

export function EmergencyTriageSelect({ encounterId, currentLevel }: { encounterId: string; currentLevel: string | null }) {
  const t = useTranslations("emergency");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const select = (value: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("triageLevel", value);
      const res = await setTriageAction(encounterId, null, fd);
      if (res?.ok) {
        toast.success(t("triageLevel"));
        router.refresh();
      } else {
        toast.error("Failed");
      }
    });
  };

  return (
    <Select value={currentLevel ?? ""} onValueChange={select} disabled={isPending}>
      <SelectTrigger className="h-7 w-40 text-xs">
        <SelectValue placeholder={t("triage")} />
      </SelectTrigger>
      <SelectContent>
        {TRIAGE_LEVELS.map((level) => (
          <SelectItem key={level.value} value={level.value}>{t(level.key)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}