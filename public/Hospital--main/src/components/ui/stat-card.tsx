import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  change?: { value: string; positive?: boolean };
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-accent text-accent-foreground",
  primary: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-destructive/12 text-destructive",
  info: "bg-info/12 text-info",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  change,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-muted-foreground leading-tight">
          {label}
        </p>
        {Icon && (
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              variantStyles[variant]
            )}
          >
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="tnum text-2xl font-semibold tracking-tight">{value}</span>
        {change && (
          <span
            className={cn(
              "text-xs font-medium",
              change.positive ? "text-success" : "text-destructive"
            )}
          >
            {change.positive ? "↑ " : "↓ "}
            {change.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}