"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  Database,
  HardDrive,
  LoaderCircle,
  Server,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatBytes, formatDateTime } from "@/lib/transfers/format";
import type { DashboardTransferStats } from "@/lib/transfers/queries";
import type { RevenueCards as RevenueCardsData } from "@/lib/dashboard/stats";
import { formatCurrency, formatPercentSigned } from "@/lib/format";
import { cn } from "@/lib/cn";

interface IncomeCardProps {
  title: string;
  compareLabel: string;
  current: number;
  previous: number;
  changePercent: number;
}

function IncomeCard({ title, compareLabel, current, previous, changePercent }: IncomeCardProps) {
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

export function TransferDashboard() {
  const { t, locale } = useLocale();
  const [data, setData] = useState<(DashboardTransferStats & { revenue?: RevenueCardsData }) | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/transfers", { cache: "no-store" });
      if (!response.ok) throw new Error("FETCH_FAILED");
      const json = await response.json();
      setData(json);
      setError(null);
    } catch {
      setError(t.transfers.loadError);
    }
  }, [t]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    function schedule(ms: number) {
      timer = setTimeout(() => void tick(), ms);
    }

    async function tick() {
      if (document.visibilityState !== "visible") {
        if (!stopped) schedule(60_000);
        return;
      }
      await load();
      if (!stopped) schedule(5_000);
    }

    schedule(0);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void tick();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  if (error && !data) {
    return <p className="text-sm font-semibold text-destructive">{error}</p>;
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        {t.transfers.loading}
      </div>
    );
  }

  const today = data.today;
  const recent = data.recent;
  const revenue = data.revenue ?? {
    daily: { current: 0, previous: 0, changePercent: 0 },
    weekly: { current: 0, previous: 0, changePercent: 0 },
    monthly: { current: 0, previous: 0, changePercent: 0 },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <IncomeCard
          title={t.sidebar.dailyIncome}
          current={revenue.daily.current}
          previous={revenue.daily.previous}
          changePercent={revenue.daily.changePercent}
          compareLabel={t.dashboard.revenueCards.compareYesterday}
        />
        <IncomeCard
          title={t.sidebar.weeklyIncome}
          current={revenue.weekly.current}
          previous={revenue.weekly.previous}
          changePercent={revenue.weekly.changePercent}
          compareLabel={t.dashboard.revenueCards.compareLastWeek}
        />
        <IncomeCard
          title={t.sidebar.monthlyIncome}
          current={revenue.monthly.current}
          previous={revenue.monthly.previous}
          changePercent={revenue.monthly.changePercent}
          compareLabel={t.dashboard.revenueCards.compareLastMonth}
        />
        <StatCard
          title={t.transfers.table.size}
          value={formatBytes(today.totalBytes, t.transfers.bytes)}
          icon={Database}
          tone="primary"
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Clock className="size-4 text-primary" aria-hidden="true" />
          {t.transfers.history}
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.transfers.empty}</p>
        ) : (
          <ul className="space-y-3">
            {recent.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {job.customerName ?? job.sourcePath}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {job.agentName ?? "—"} · {formatDateTime(job.createdAt, locale)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-muted-foreground">
                  {formatBytes(job.transferredSize, t.transfers.bytes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.deviceTypeStats.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-foreground">
            <HardDrive className="size-4 text-primary" aria-hidden="true" />
            {t.transfers.devices}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.deviceTypeStats.map((stat) => (
              <li key={stat.deviceType} className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">
                  {t.transfers.deviceTypes[stat.deviceType as keyof typeof t.transfers.deviceTypes] ??
                    stat.deviceType}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.transfers} · {formatBytes(stat.bytes, t.transfers.bytes)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.agents.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-foreground">
            <Server className="size-4 text-primary" aria-hidden="true" />
            {t.transfers.agents}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.agents.map((agent) => (
              <li key={agent.agentId} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{agent.name}</p>
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      agent.status === "ONLINE" ? "bg-success" : "bg-muted-foreground"
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {agent.ipAddress ?? "—"} · {formatDateTime(agent.lastHeartbeat, locale)}
                </p>
                {agent.serverHost && (
                  <p className="mt-1 truncate text-xs text-muted-foreground" dir="ltr">
                    <span className="font-semibold text-foreground">{t.transfers.agentsServer}:</span>{" "}
                    {agent.serverHost}
                  </p>
                )}
                {agent.folders.length > 0 && (
                  <p className="mt-1 truncate text-[11px] text-muted-foreground" dir="ltr">
                    {agent.folders.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
