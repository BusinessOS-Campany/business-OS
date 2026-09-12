"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, RefreshCw, Trash2, X, XCircle } from "lucide-react";
import type { BalanceChargeRow, BalanceChargesSummary } from "@/lib/balance/queries";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-provider";
import { BalanceChargeForm } from "@/components/balance/balance-charge-form";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface BalanceTotalsViewProps {
  initialSummary: BalanceChargesSummary;
}

const actionButton =
  "inline-flex size-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

export function BalanceTotalsView({ initialSummary }: BalanceTotalsViewProps) {
  const { t, locale } = useLocale();
  const bt = t.balanceTotals;
  const dt = t.dataTable;
  const [summary, setSummary] = useState<BalanceChargesSummary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BalanceChargeRow | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error"; text: string } | null>(null);

  useEffect(() => {
    document.body.style.overflow = formOpen || editing ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [formOpen, editing]);

  useEffect(() => {
    if (!formOpen && !editing) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFormOpen(false);
        setEditing(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formOpen, editing]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/balance/charge");
      if (res.ok) {
        const data = (await res.json()) as BalanceChargesSummary;
        setSummary(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function openEdit(row: BalanceChargeRow) {
    setMessage(null);
    setEditing(row);
  }

  function handleFormSuccess() {
    void refresh();
    closeForm();
  }

  async function confirmDelete(row: BalanceChargeRow) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/balance/charge/${row.id}`, {
        method: "DELETE",
        headers: { "Accept-Language": locale },
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? bt.deleteError });
      } else {
        setPendingDeleteId(null);
        await refresh();
      }
    } catch {
      setMessage({ type: "error", text: bt.deleteError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="primary" size="md" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          {bt.addBalanceSale}
        </Button>
      </div>

      <DataTable
        rows={summary.rows}
        title={
          <span className="flex items-center gap-2">
            {bt.chargesTable}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              {formatNumber(summary.count)}
            </span>
          </span>
        }
        keyOf={(row) => row.id}
        searchText={(row) =>
          [row.provider, row.notes ?? "", String(row.amount), row.createdByName ?? ""].join(" ")
        }
        labels={{
          lengthMenu: dt.lengthMenu,
          rows: dt.rows,
          search: dt.search,
          searchPlaceholder: dt.searchPlaceholder,
          info: dt.info,
          prev: dt.prev,
          next: dt.next,
          noData: bt.noData,
        }}
        minWidth="min-w-160"
        empty={bt.noData}
        columns={[
          {
            header: bt.provider,
            cell: (row) => (
              <span className="text-sm font-bold text-foreground">{row.provider}</span>
            ),
          },
          {
            header: bt.amount,
            cell: (row) => (
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(row.amount)}
              </span>
            ),
          },
          {
            header: bt.notes,
            cell: (row) => (
              <span className="text-xs text-muted-foreground">
                {row.notes?.trim() ? row.notes : "—"}
              </span>
            ),
          },
          {
            header: bt.employee,
            cell: (row) => (
              <span className="text-xs text-muted-foreground">{row.createdByName ?? "—"}</span>
            ),
          },
          {
            header: bt.date,
            cell: (row) => (
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatDateTime(row.createdAt, locale)}
              </span>
            ),
          },
          {
            header: bt.actions,
            className: "text-end",
            cell: (row) =>
              pendingDeleteId === row.id ? (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => void confirmDelete(row)}
                    disabled={loading}
                    title={bt.confirm}
                    className={cn(actionButton, "border-success/40 text-success hover:bg-success/10")}
                  >
                    <Check className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(null)}
                    disabled={loading}
                    title={bt.cancel}
                    className={cn(actionButton, "border-destructive/40 text-destructive hover:bg-destructive/10")}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    disabled={loading}
                    title={bt.edit}
                    className={actionButton}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDeleteId(row.id);
                      setMessage(null);
                    }}
                    disabled={loading}
                    title={bt.delete}
                    className={cn(actionButton, "text-destructive hover:bg-destructive/10")}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ),
          },
        ]}
      />

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <p className="text-sm text-muted-foreground">
          {bt.totalAmount}:{" "}
          <span className="font-extrabold tabular-nums text-primary">
            {formatCurrency(summary.totalAmount)}
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={refresh} loading={loading}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {bt.refresh}
        </Button>
      </footer>

      {message && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive",
          )}
        >
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{message.text}</span>
        </div>
      )}

      {(formOpen || editing) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeForm}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <BalanceChargeForm
              key={editing?.id ?? "new"}
              initialData={editing}
              onSuccess={handleFormSuccess}
              onClose={closeForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}
