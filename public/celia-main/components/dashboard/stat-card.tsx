import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "primary" | "success" | "warning" | "danger";

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  tone: Tone;
}

const chipGradients: Record<Tone, string> = {
  primary: `linear-gradient(135deg, color-mix(in srgb, var(--primary) 70%, white), color-mix(in srgb, var(--primary) 70%, black))`,
  success: `linear-gradient(135deg, color-mix(in srgb, var(--success) 70%, white), color-mix(in srgb, var(--success) 70%, black))`,
  warning: `linear-gradient(135deg, color-mix(in srgb, var(--warning) 70%, white), color-mix(in srgb, var(--warning) 70%, black))`,
  danger: `linear-gradient(135deg, color-mix(in srgb, var(--destructive) 70%, white), color-mix(in srgb, var(--destructive) 70%, black))`,
};

const barGradients: Record<Tone, string> = {
  primary: `linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 25%, transparent))`,
  success: `linear-gradient(90deg, var(--success), color-mix(in srgb, var(--success) 25%, transparent))`,
  warning: `linear-gradient(90deg, var(--warning), color-mix(in srgb, var(--warning) 25%, transparent))`,
  danger: `linear-gradient(90deg, var(--destructive), color-mix(in srgb, var(--destructive) 25%, transparent))`,
};

const glows: Record<Tone, string> = {
  primary: "bg-primary/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-destructive/10",
};

export function StatCard({ title, value, unit, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundImage: barGradients[tone] }}
        aria-hidden="true"
      />
      <div
        className={cn(
          "absolute -end-10 -top-10 size-32 rounded-full blur-2xl transition-transform duration-300 group-hover:scale-125",
          glows[tone],
        )}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-4">
        <div className="relative z-10">
          <p className="text-3xl font-black tracking-tight tabular-nums text-foreground">
            {value}
            {unit && <sup className="ms-1 text-base font-bold text-muted-foreground">{unit}</sup>}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-muted-foreground">{title}</p>
        </div>
        <div
          className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
          style={{ backgroundImage: chipGradients[tone] }}
        >
          <Icon className="size-6 text-white" strokeWidth={2} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
