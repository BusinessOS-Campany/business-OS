"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function PatientActions() {
  const t = useTranslations("patients");
  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
      <PrinterIcon className="size-3.5" />
      {t("printCard")}
    </Button>
  );
}