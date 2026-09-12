"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import type { RevenueCards as RevenueCardsData } from "@/lib/dashboard/stats";
import { formatCurrency, formatPercentSigned } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n/locale-provider";

interface RevenueCardsProps {
  revenue: RevenueCardsData;
}

interface RevenueItem {
  key: "daily" | "weekly" | "monthly";
  title: string;
  compareLabel: string;
}

interface RevenueCardProps {
  title: string;
  compareLabel: string;
  current: number;
  previous: number;
  changePercent: number;
}

function RevenueCard({ title, compareLabel, current, previous, changePercent }: RevenueCardProps) {
  const { t } = useLocale();
  const isUp = changePercent >= 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;
  const hasBaseline = previous > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-black tracking-tight tabular-nums text-foreground">
        {formatCurrency(current)}
      </p>
      <div className="mt-3 flex items-center gap-2">
        {hasBaseline ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
              isUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            <TrendIcon className="size-3.5" aria-hidden="true" />
            {formatPercentSigned(changePercent)}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
            {current > 0 ? t.dashboard.revenueCards.newLabel : "—"}
          </span>
        )}
        <span className="text-xs font-medium text-muted-foreground">{compareLabel}</span>
      </div>
    </div>
  );
}

export function RevenueCards({ revenue }: RevenueCardsProps) {
  const { t } = useLocale();
  const rc = t.dashboard.revenueCards;

  const items: RevenueItem[] = [
    { key: "daily", title: rc.daily, compareLabel: rc.compareYesterday },
    { key: "weekly", title: rc.weekly, compareLabel: rc.compareLastWeek },
    { key: "monthly", title: rc.monthly, compareLabel: rc.compareLastMonth },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => {
        const period = revenue[item.key];
        return (
          <RevenueCard
            key={item.key}
            title={item.title}
            compareLabel={item.compareLabel}
            current={period.current}
            previous={period.previous}
            changePercent={period.changePercent}
          />
        );
      })}
    </div>
  );
}
