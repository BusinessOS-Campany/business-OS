"use client";

import { useLang } from "@/i18n/LanguageProvider";

const tones: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  red: "bg-red-500/10 text-red-700 dark:text-red-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  sky: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

const statusTone: Record<string, string> = {
  COMPLETED: "emerald",
  PAID: "emerald",
  RECEIVED: "emerald",
  APPROVED: "emerald",
  ACTIVE: "emerald",
  SYNCED: "emerald",
  OPEN: "emerald",
  CONFIRMED: "emerald",
  PENDING: "amber",
  DRAFT: "amber",
  HELD: "amber",
  PARTIALLY_PAID: "amber",
  PARTIALLY_RECEIVED: "amber",
  SHIPPED: "amber",
  REQUESTED: "sky",
  CANCELLED: "red",
  REJECTED: "red",
  FAILED: "red",
  INACTIVE: "red",
  SUSPENDED: "red",
  OVERPAID: "sky",
  REFUNDED: "slate",
  CLOSED: "slate",
};

export function StatusBadge({ status, labelKey }: { status: string; labelKey?: string }) {
  const { t } = useLang();
  const tone = statusTone[status] ?? "slate";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {labelKey ? t(labelKey) : status}
    </span>
  );
}