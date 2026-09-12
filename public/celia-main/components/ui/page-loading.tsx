"use client";

import { LoaderCircle } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/cn";

interface PageLoadingProps {
  showShell?: boolean;
}

export function PageLoading({ showShell = false }: PageLoadingProps) {
  const { t } = useLocale();

  if (showShell) {
    return (
      <div className="flex min-h-dvh">
        <aside className="hidden w-72 shrink-0 border-e border-border bg-card md:block">
          <div className="flex h-16 items-center border-b border-border px-5">
            <div className="flex items-center gap-2.5">
              <div className="size-10 animate-pulse rounded-lg bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
          <div className="space-y-3 px-3 py-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center border-b border-border bg-background/85 px-4">
            <div className="size-9 animate-pulse rounded-lg bg-muted" />
            <div className="ms-auto flex items-center gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="size-9 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            <div className="space-y-6">
              <div>
                <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
                <div className="mt-2 h-3 w-64 animate-pulse rounded-md bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
              <div className="h-64 animate-pulse rounded-xl bg-muted" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className={cn("size-7 animate-spin text-primary")} aria-hidden="true" />
        <p className="text-sm font-semibold text-muted-foreground">{t.common.loading}</p>
      </div>
    </div>
  );
}
