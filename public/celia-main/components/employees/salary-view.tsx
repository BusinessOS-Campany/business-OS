"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, RefreshCw, Save, XCircle } from "lucide-react";
import type { EmployeeRow, EmployeesSummary } from "@/lib/employees/queries";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-provider";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface SalaryViewProps {
  initialSummary: EmployeesSummary;
}

export function SalaryView({ initialSummary }: SalaryViewProps) {
  const { t, locale } = useLocale();
  const sp = t.salaryPage;
  const dt = t.dataTable;
  const [summary, setSummary] = useState<EmployeesSummary>(initialSummary);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/employees", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as EmployeesSummary;
        setSummary(data);
        setEdits({});
      }
    } catch {
      // keep current rows on failure
    }
  }, []);

  function departmentLabel(value: string | null): string {
    if (!value) return "—";
    const label = t.roles[value as keyof typeof t.roles];
    return label ?? value;
  }

  function draftValue(row: EmployeeRow): string {
    return edits[row.id] ?? (row.salary != null ? String(row.salary) : "");
  }

  function setDraft(row: EmployeeRow, value: string) {
    setMessage(null);
    setEdits((prev) => ({ ...prev, [row.id]: value }));
  }

  async function saveSalary(row: EmployeeRow) {
    const value = draftValue(row);
    const next = value.trim() === "" ? undefined : value;
    const current = row.salary != null ? String(row.salary) : undefined;
    if (next === current) return;

    setSavingId(row.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/employees/${row.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({ salary: next }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? sp.saveError });
      } else {
        setMessage({ type: "success", text: data?.message ?? sp.saved });
        await refresh();
      }
    } catch {
      setMessage({ type: "error", text: sp.serverError });
    } finally {
      setSavingId(null);
    }
  }

  const totalSalaries = summary.rows.reduce((sum, row) => sum + (row.salary ?? 0), 0);

  return (
    <div className="space-y-6">
      {message && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium",
            message.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <DataTable
        rows={summary.rows}
        title={
          <span className="flex items-center gap-2">
            {sp.tableTitle}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              {formatNumber(summary.count)}
            </span>
          </span>
        }
        keyOf={(row) => row.id}
        searchText={(row) =>
          [row.name, departmentLabel(row.department), String(row.salary ?? "")].join(" ")
        }
        labels={{
          lengthMenu: dt.lengthMenu,
          rows: dt.rows,
          search: dt.search,
          searchPlaceholder: dt.searchPlaceholder,
          info: dt.info,
          prev: dt.prev,
          next: dt.next,
          noData: sp.noData,
        }}
        minWidth="min-w-160"
        rowClassName={(row) => (!row.isActive ? "opacity-50" : undefined)}
        empty={sp.noData}
        columns={[
          {
            header: sp.employee,
            cell: (row) => (
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-foreground">{row.name}</span>
                <span className="text-xs text-muted-foreground">
                  {departmentLabel(row.department)}
                </span>
              </div>
            ),
          },
          {
            header: sp.currentSalary,
            cell: (row) => (
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {row.salary != null ? formatCurrency(row.salary) : "—"}
              </span>
            ),
          },
          {
            header: sp.newSalary,
            cell: (row) => (
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                dir="ltr"
                placeholder="0"
                value={draftValue(row)}
                onChange={(e) => setDraft(row, e.target.value)}
                disabled={savingId === row.id}
                className="h-9 max-w-36 text-sm"
              />
            ),
          },
          {
            header: "",
            className: "text-end",
            cell: (row) => {
              const value = draftValue(row);
              const current = row.salary != null ? String(row.salary) : "";
              const changed = (value.trim() === "" ? "" : value) !== current;
              return (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!changed || savingId === row.id}
                  loading={savingId === row.id}
                  onClick={() => saveSalary(row)}
                >
                  <Save className="size-4" aria-hidden="true" />
                  {savingId === row.id ? sp.saving : sp.save}
                </Button>
              );
            },
          },
        ]}
      />

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <p>
            {sp.totalSalaries}:{" "}
            <span className="font-extrabold tabular-nums text-foreground">
              {formatCurrency(totalSalaries)}
            </span>
          </p>
          <p>
            {sp.activeEmployees}:{" "}
            <span className="font-bold tabular-nums text-success">
              {formatNumber(summary.activeCount)}
            </span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {sp.refresh}
        </Button>
      </footer>
    </div>
  );
}
