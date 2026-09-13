"use client";

import Link from "next/link";
import { ArrowUpLeft, LayoutGrid } from "lucide-react";
import { flattenPages, getSidebarSections } from "@/lib/nav";
import { useLocale } from "@/lib/i18n/locale-provider";

export function StartHub() {
  const { t } = useLocale();
  const pages = flattenPages(getSidebarSections(t)).filter((page) => page.href !== "/start");

  return (
    <div>
      <p className="mb-5 text-sm text-muted-foreground">{t.start.subtitle}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pages.map((page) => {
          const Icon = page.icon ?? LayoutGrid;
          return (
            <Link
              key={page.href}
              href={page.href}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/10"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">{page.label}</span>
                <span className="block text-xs text-primary/80">{t.start.open}</span>
              </span>
              <ArrowUpLeft
                className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary rtl:-scale-x-100"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}