import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon, HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm">
      <ol className="flex items-center gap-1 flex-wrap">
        <li>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <HomeIcon className="size-3.5" />
          </Link>
        </li>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1">
              <ChevronRightIcon className="size-3.5 text-muted-foreground/60 rtl:rotate-180" />
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    last ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  icon?: React.ReactElement<{ className?: string }>;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 pb-2", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="hidden sm:flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground ring-1 ring-border">
              {React.cloneElement(icon, {
                className: "size-5",
              })}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}