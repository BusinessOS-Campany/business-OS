import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  actionLabel,
  onAction,
  actionHref,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center",
        compact ? "py-8 px-6" : "py-14 px-6",
        className
      )}
    >
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon className="size-6" />
        </div>
      )}
      <div>
        <p className="font-medium">{title}</p>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {actionLabel && (
        <Button
          size="sm"
          variant="outline"
          onClick={onAction}
          {...(actionHref ? { asChild: true, ...{} } : {})}
        >
          {actionHref ? (
            <a href={actionHref}>{actionLabel}</a>
          ) : (
            actionLabel
          )}
        </Button>
      )}
    </div>
  );
}