"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, RefreshCw, Trash2, X, XCircle } from "lucide-react";
import type { ExpenseRow, ExpensesSummary } from "@/lib/expenses/queries";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-provider";
import { AddExpenseForm } from "@/components/expenses/add-expense-form";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface ExpensesViewProps {
  initialSummary: ExpensesSummary;
}

const actionButton =
  "inline-flex size-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

export function ExpensesView({ initialSummary }: ExpensesViewProps) {
  const { t, locale } = useLocale();
  const et = t.expensesTotals;
  const dt = t.dataTable;
  const [summary, setSummary] = useState<ExpensesSummary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error"; text: string } | null>(null);

  useEffect(() => {
    document.body.style.overflow = formOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [formOpen]);

  useEffect(() => {
    if (!formOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFormOpen(false);
        setEditing(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formOpen]);

  function paymentMethodLabel(value: string | null): string {
    if (!value) return "—";
    const label = t.addExpense.paymentMethods[value as keyof typeof t.addExpense.paymentMethods];
    return label ?? value;
  }

  function openAdd() {
    setEditing(null);
    setMessage(null);
    setFormOpen(true);
  }

  function openEdit(row: ExpenseRow) {
    setEditing(row);
    setMessage(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expenses", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as ExpensesSummary;
        setSummary(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  async function confirmDelete(row: ExpenseRow) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/expenses/${row.id}`, {
        method: "DELETE",
        headers: { "Accept-Language": locale },
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? t.addExpense.deleteError });
      } else {
        setPendingDeleteId(null);
        await refresh();
      }
    } catch {
      setMessage({ type: "error", text: t.addExpense.serverError });
    } finally {
      setLoading(false);
    }
  }

  function handleFormSuccess() {
    void refresh();
    closeForm();
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button variant="primary" size="md" onClick={openAdd}>
          <Plus className="size-4" aria-hidden="true" />
          {et.addExpense}
        </Button>
      </div>

      <DataTable
        rows={summary.rows}
        title={
          <span className="flex items-center gap-2">
            {et.tableTitle}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              {formatNumber(summary.count)}
            </span>
          </span>
        }
        keyOf={(row) => row.id}
        searchText={(row) =>
          [
            row.type,
            String(row.amount),
            paymentMethodLabel(row.paymentMethod),
            row.notes ?? "",
            row.createdByName ?? "",
          ].join(" ")
        }
        labels={{
          lengthMenu: dt.lengthMenu,
          rows: dt.rows,
          search: dt.search,
          searchPlaceholder: dt.searchPlaceholder,
          info: dt.info,
          prev: dt.prev,
          next: dt.next,
          noData: et.noData,
        }}
        minWidth="min-w-160"
        empty={et.noData}
        columns={[
          {
            header: et.type,
            cell: (row) => (
              <span className="text-sm font-bold text-foreground">{row.type}</span>
            ),
          },
          {
            header: et.amount,
            cell: (row) => (
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(row.amount)}
              </span>
            ),
          },
          {
            header: et.paymentMethod,
            cell: (row) => (
              <span className="text-xs text-muted-foreground">
                {paymentMethodLabel(row.paymentMethod)}
              </span>
            ),
          },
          {
            header: et.notes,
            cell: (row) => (
              <span className="text-xs text-muted-foreground">
                {row.notes?.trim() ? row.notes : "—"}
              </span>
            ),
          },
          {
            header: et.employee,
            cell: (row) => (
              <span className="text-xs text-muted-foreground">{row.createdByName ?? "—"}</span>
            ),
          },
          {
            header: et.date,
            cell: (row) => (
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatDateTime(row.expenseDate, locale)}
              </span>
            ),
          },
          {
            header: et.actions,
            className: "text-end",
            cell: (row) =>
              pendingDeleteId === row.id ? (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => confirmDelete(row)}
                    disabled={loading}
                    title={et.confirm}
                    className={cn(actionButton, "border-success/40 text-success hover:bg-success/10")}
                  >
                    <Check className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(null)}
                    disabled={loading}
                    title={et.cancel}
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
                    title={et.edit}
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
                    title={et.delete}
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
          {et.totalAmount}:{" "}
          <span className="font-extrabold tabular-nums text-destructive">
            {formatCurrency(summary.totalAmount)}
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={refresh} loading={loading}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {et.refresh}
        </Button>
      </footer>

      {formOpen && (
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
            <AddExpenseForm
              key={editing?.id ?? "new"}
              expense={editing}
              onSuccess={handleFormSuccess}
              onClose={closeForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}
