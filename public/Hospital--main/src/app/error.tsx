"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

export default function GlobalErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <main className="app-glow flex min-h-dvh flex-col items-center justify-center bg-dots px-4">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl border bg-card shadow-[var(--shadow-popover)]">
          <TriangleAlert className="size-9 text-destructive" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{t("errors.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.serverError")}</p>
        <button
          onClick={reset}
          className="mt-8 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("common.retry")}
        </button>
      </div>
    </main>
  );
}