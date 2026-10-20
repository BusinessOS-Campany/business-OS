"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function DateRangeForm({ from, to }: { from?: string; to?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [fromDate, setFromDate] = React.useState(from ?? "");
  const [toDate, setToDate] = React.useState(to ?? "");

  const apply = () => {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    router.push(`/reports${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clear = () => {
    setFromDate("");
    setToDate("");
    router.push("/reports");
  };

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 pt-4">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("common.from")}</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("common.to")}</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Button size="sm" className="gap-1.5" onClick={apply}>
          <Filter className="size-3.5" />
          {t("reports.generate")}
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={clear}>
          <RotateCcw className="size-3.5" />
          {t("common.clear")}
        </Button>
      </CardContent>
    </Card>
  );
}
