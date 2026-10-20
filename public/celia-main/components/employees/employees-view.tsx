"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, RefreshCw, Trash2, X, XCircle } from "lucide-react";
import type { EmployeeRow, EmployeesSummary } from "@/lib/employees/queries";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-provider";
import { EmployeeForm } from "@/components/employees/employee-form";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface EmployeesViewProps {
  initialSummary: EmployeesSummary;
}

const actionButton =
  "inline-flex size-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

export function EmployeesView({ initialSummary }: EmployeesViewProps) {
  const { t, locale } = useLocale();
  const em = t.employeesManagement;
  const dt = t.dataTable;
  const [summary, setSummary] = useState<EmployeesSummary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
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

  function openAdd() {
    setEditing(null);
    setMessage(null);
    setFormOpen(true);
  }

  function openEdit(row: EmployeeRow) {
    setEditing(row);
    setMessage(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function departmentLabel(value: string | null): string {
    if (!value) return "—";
    const label = t.roles[value as keyof typeof t.roles];
    return label ?? value;
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/celia/api/employees", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as EmployeesSummary;
        setSummary(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  async function toggleStatus(row: EmployeeRow) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/celia/api/employees/${row.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? em.saveError });
      } else {
        await refresh();
      }
    } catch {
      setMessage({ type: "error", text: em.serverError });
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete(row: EmployeeRow) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/celia/api/employees/${row.id}`, {
        method: "DELETE",
        headers: { "Accept-Language": locale },
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? em.deleteError });
      } else {
        setPendingDeleteId(null);
        await refresh();
      }
    } catch {
      setMessage({ type: "error", text: em.serverError });
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
          {em.addEmployee}
        </Button>
      </div>

      <DataTable
        rows={summary.rows}
        title={
          <span className="flex items-center gap-2">
            {em.tableTitle}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              {formatNumber(summary.count)}
            </span>
          </span>
        }
        keyOf={(row) => row.id}
        searchText={(row) =>
          [row.name, departmentLabel(row.department), row.phone ?? "", String(row.salary ?? "")].join(
            " ",
          )
        }
        labels={{
          lengthMenu: dt.lengthMenu,
          rows: dt.rows,
          search: dt.search,
          searchPlaceholder: dt.searchPlaceholder,
          info: dt.info,
          prev: dt.prev,
          next: dt.next,
          noData: em.noData,
        }}
        minWidth="min-w-180"
        rowClassName={(row) => (!row.isActive ? "opacity-50" : undefined)}
        empty={em.noData}
        columns={[
          {
            header: em.name,
            cell: (row) => (
              <span className="text-sm font-bold text-foreground">{row.name}</span>
            ),
          },
          {
            header: em.department,
            cell: (row) => (
              <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground">
                {departmentLabel(row.department)}
              </span>
            ),
          },
          {
            header: em.phone,
            cell: (row) => (
              <span className="text-xs tabular-nums text-muted-foreground" dir="ltr">
                {row.phone || "—"}
              </span>
            ),
          },
          {
            header: em.salary,
            cell: (row) => (
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {row.salary != null ? formatCurrency(row.salary) : "—"}
              </span>
            ),
          },
          {
            header: em.status,
            cell: (row) => (
              <button
                type="button"
                role="switch"
                aria-checked={row.isActive}
                onClick={() => toggleStatus(row)}
                disabled={loading}
                title={row.isActive ? em.deactivate : em.activate}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                  "disabled:pointer-events-none disabled:opacity-50",
                  row.isActive ? "justify-end bg-success" : "justify-start bg-muted",
                )}
              >
                <span className="inline-block size-4 rounded-full bg-white shadow" />
              </button>
            ),
          },
          {
            header: em.actions,
            className: "text-end",
            cell: (row) =>
              pendingDeleteId === row.id ? (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => confirmDelete(row)}
                    disabled={loading}
                    title={em.confirm}
                    className={cn(actionButton, "border-success/40 text-success hover:bg-success/10")}
                  >
                    <Check className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(null)}
                    disabled={loading}
                    title={em.cancel}
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
                    title={em.edit}
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
                    title={em.delete}
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
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <p>
            {em.totalEmployees}:{" "}
            <span className="font-extrabold tabular-nums text-foreground">
              {formatNumber(summary.count)}
            </span>
          </p>
          <p>
            {em.activeEmployees}:{" "}
            <span className="font-bold tabular-nums text-success">
              {formatNumber(summary.activeCount)}
            </span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} loading={loading}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {em.refresh}
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
            <EmployeeForm
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
