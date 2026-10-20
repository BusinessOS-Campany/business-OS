"use client";
import { Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function DeliveryEstimate() {
  const { t } = useI18n();
  const today = new Date();
  const eta = new Date(today);
  eta.setDate(eta.getDate() + 3);
  const eta2 = new Date(today);
  eta2.setDate(eta2.getDate() + 7);

  function fmt(d: Date) {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return `${days[d.getDay()]}، ${d.toLocaleDateString("ar-SA")}`;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Truck className="h-4 w-4 text-primary" />
        {t("detail.delivery_estimate")}
      </div>
      <p className="text-sm text-muted-foreground">
        التوصيل المتوقع: <span className="text-foreground font-medium">{fmt(eta)}</span> – <span className="text-foreground font-medium">{fmt(eta2)}</span>
      </p>
      <p className="text-xs text-muted-foreground">{t("detail.delivery_note")}</p>
    </div>
  );
}
