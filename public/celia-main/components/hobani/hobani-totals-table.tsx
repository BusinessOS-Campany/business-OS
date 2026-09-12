"use client";

import { useState } from "react";
import { Check, Eye, Trash2, X } from "lucide-react";
import type { HobaniTotalRow } from "@/lib/hobani/totals";
import { hobaniPeriodLabel } from "@/lib/hobani/income";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-provider";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/cn";

interface HobaniTotalsTableProps {
  initialRows: HobaniTotalRow[];
  onDetails?: (row: HobaniTotalRow) => void;
  onDeleteGroup?: (row: HobaniTotalRow) => Promise<boolean>;
}

const actionButton =
  "inline-flex size-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

export function HobaniTotalsTable({
  initialRows,
  onDetails,
  onDeleteGroup,
}: HobaniTotalsTableProps) {
  const { t, locale } = useLocale();
  const ht = t.hobaniTotals;
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function groupKey(row: HobaniTotalRow) {
    return `${row.dayKey}-${row.period}`;
  }

  async function handleConfirmDelete(row: HobaniTotalRow) {
    if (!onDeleteGroup) return;
    setDeleting(true);
    try {
      const success = await onDeleteGroup(row);
      if (success) setPendingDeleteKey(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DataTable
      rows={initialRows}
      title={ht.pageTitle}
      keyOf={(row) => groupKey(row)}
      searchText={(row) =>
        [
          hobaniPeriodLabel(row.period, t),
          new Date(row.day).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB"),
          String(row.totalCards),
        ].join(" ")
      }
      labels={{
        lengthMenu: ht.lengthMenu,
        rows: ht.rows,
        search: ht.search,
        searchPlaceholder: ht.searchPlaceholder,
        info: ht.info,
        prev: ht.prev,
        next: ht.next,
        noData: ht.noData,
      }}
      columns={[
        {
          header: ht.colPeriod,
          cell: (row) => (
            <span className="text-sm font-bold text-foreground">
              {hobaniPeriodLabel(row.period, t)}
            </span>
          ),
        },
        {
          header: ht.colCards,
          cell: (row) => (
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatNumber(row.totalCards)}
            </span>
          ),
        },
        {
          header: ht.colAmount,
          cell: (row) => (
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {formatCurrency(row.totalAmount)}
            </span>
          ),
        },
        {
          header: ht.colCardValue,
          cell: (row) => (
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {formatCurrency(row.totalCardValue)}
            </span>
          ),
        },
        {
          header: ht.colDate,
          cell: (row) => (
            <span className="text-xs tabular-nums text-muted-foreground">
              {new Date(row.day).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}
            </span>
          ),
        },
        {
          header: ht.actions,
          className: "text-end",
          cell: (row) =>
            pendingDeleteKey === groupKey(row) ? (
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(row)}
                  disabled={deleting}
                  title={ht.confirm}
                  className={cn(actionButton, "border-success/40 text-success hover:bg-success/10")}
                >
                  <Check className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteKey(null)}
                  disabled={deleting}
                  title={ht.cancel}
                  className={cn(actionButton, "border-destructive/40 text-destructive hover:bg-destructive/10")}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => onDetails?.(row)}
                  disabled={deleting}
                  title={ht.details}
                  className={actionButton}
                >
                  <Eye className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteKey(groupKey(row))}
                  disabled={deleting}
                  title={ht.delete}
                  className={cn(actionButton, "text-destructive hover:bg-destructive/10")}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ),
        },
      ]}
    />
  );
}
