"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDollarSign, HardDrive, Wallet } from "lucide-react";
import type { DashboardStats } from "@/lib/dashboard/stats";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueCards } from "@/components/dashboard/revenue-cards";
import { ReportCard } from "@/components/dashboard/report-card";

interface DashboardContentProps {
  initialStats: DashboardStats;
}

const REFRESH_INTERVAL_MS = 30000;

export function DashboardContent({ initialStats }: DashboardContentProps) {
  const { locale, t } = useLocale();
  const [stats, setStats] = useState<DashboardStats>(initialStats);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      if (document.visibilityState !== "visible") {
        if (!stopped) timer = setTimeout(load, 120_000);
        return;
      }
      try {
        const res = await fetch("/api/dashboard/stats", {
          headers: { "Accept-Language": locale },
        });
        if (!res.ok) return;
        const data = (await res.json()) as DashboardStats;
        if (!stopped) setStats(data);
      } catch {
        // keep last known stats on network errors
      } finally {
        if (!stopped) timer = setTimeout(load, REFRESH_INTERVAL_MS);
      }
    };

    timer = setTimeout(load, REFRESH_INTERVAL_MS);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void load();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [locale]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title={t.dashboard.today.completedCopies}
          value={formatNumber(stats.today.completedCopies)}
          icon={CheckCircle2}
          tone="primary"
        />
        <StatCard
          title={t.dashboard.today.sizeGB}
          value={formatNumber(stats.today.sizeGB)}
          unit="GB"
          icon={HardDrive}
          tone="success"
        />
        <StatCard
          title={t.dashboard.today.hobaniIncome}
          value={formatCurrency(stats.today.hobaniIncome)}
          icon={CircleDollarSign}
          tone="warning"
        />
        <StatCard
          title={t.dashboard.today.totalBalance ?? "اجمالي الشحن"}
          value={formatCurrency(stats.today.balanceTotal ?? 0)}
          icon={Wallet}
          tone="primary"
        />
      </div>

      <RevenueCards revenue={stats.revenue} />

      <ReportCard stats={stats} />
    </div>
  );
}
