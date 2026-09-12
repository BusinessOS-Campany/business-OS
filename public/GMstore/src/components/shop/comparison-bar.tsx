"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GitCompareArrows, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { comparisonCount, clearComparison } from "@/lib/comparison/store";

export function ComparisonBar() {
  const { t } = useI18n();
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(comparisonCount());
    const handler = () => setCount(comparisonCount());
    window.addEventListener("comparisonUpdated", handler);
    return () => window.removeEventListener("comparisonUpdated", handler);
  }, []);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none">
      <div className="flex items-center gap-3 rounded-full bg-card border border-border shadow-lg px-5 py-3 pointer-events-auto">
        <GitCompareArrows className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold whitespace-nowrap">
          {count} {t("comparison.count")}
        </span>
        <button
          onClick={() => router.push("/comparison")}
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {t("comparison.compare")}
        </button>
        <button
          onClick={() => { clearComparison(); }}
          className="p-1 hover:text-primary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
