"use client";

import { useCallback, useState } from "react";
import { Check, Pencil, Plus, RefreshCw, Trash2, X, XCircle } from "lucide-react";
import type { UserRow, UsersSummary } from "@/lib/users/queries";
import { formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-provider";
import { UserDialog } from "@/components/users/user-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface UsersViewProps {
  initialSummary: UsersSummary;
}

const actionButton =
  "inline-flex size-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

export function UsersView({ initialSummary }: UsersViewProps) {
  const { t, locale } = useLocale();
  const um = t.usersManagement;
  const dt = t.dataTable;
  const [summary, setSummary] = useState<UsersSummary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [dialogUser, setDialogUser] = useState<UserRow | null | undefined>(undefined);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error"; text: string } | null>(null);

  function roleLabel(value: string): string {
    const label = t.roles[value as keyof typeof t.roles];
    return label ?? value;
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as UsersSummary;
        setSummary(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  async function toggleStatus(row: UserRow) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${row.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? um.saveError });
      } else {
        await refresh();
      }
    } catch {
      setMessage({ type: "error", text: um.serverError });
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete(row: UserRow) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${row.id}`, {
        method: "DELETE",
        headers: { "Accept-Language": locale },
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? um.deleteError });
      } else {
        setPendingDeleteId(null);
        await refresh();
      }
    } catch {
      setMessage({ type: "error", text: um.serverError });
    } finally {
      setLoading(false);
    }
  }

  function handleDialogSuccess() {
    void refresh();
    setDialogUser(undefined);
    setMessage(null);
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
        <Button variant="primary" size="md" onClick={() => setDialogUser(null)}>
          <Plus className="size-4" aria-hidden="true" />
          {um.addUser}
        </Button>
      </div>

      <DataTable
        rows={summary.rows}
        title={
          <span className="flex items-center gap-2">
            {um.tableTitle}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              {formatNumber(summary.count)}
            </span>
          </span>
        }
        keyOf={(row) => row.id}
        searchText={(row) =>
          [row.name, row.username ?? "", row.email, row.phone ?? "", roleLabel(row.role)].join(" ")
        }
        labels={{
          lengthMenu: dt.lengthMenu,
          rows: dt.rows,
          search: dt.search,
          searchPlaceholder: dt.searchPlaceholder,
          info: dt.info,
          prev: dt.prev,
          next: dt.next,
          noData: um.noData,
        }}
        minWidth="min-w-200"
        rowClassName={(row) => (!row.isActive ? "opacity-50" : undefined)}
        empty={um.noData}
        columns={[
          {
            header: um.name,
            cell: (row) => (
              <span className="text-sm font-bold text-foreground">{row.name}</span>
            ),
          },
          {
            header: um.username,
            cell: (row) => (
              <span className="text-xs tabular-nums text-muted-foreground" dir="ltr">
                {row.username || "—"}
              </span>
            ),
          },
          {
            header: um.email,
            cell: (row) => (
              <span className="text-xs tabular-nums text-muted-foreground" dir="ltr">
                {row.email}
              </span>
            ),
          },
          {
            header: um.role,
            cell: (row) => (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  row.role === "admin"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-foreground",
                )}
              >
                {roleLabel(row.role)}
              </span>
            ),
          },
          {
            header: um.status,
            cell: (row) => (
              <button
                type="button"
                role="switch"
                aria-checked={row.isActive}
                onClick={() => toggleStatus(row)}
                disabled={loading}
                title={row.isActive ? um.deactivate : um.activate}
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
            header: um.actions,
            className: "text-end",
            cell: (row) =>
              pendingDeleteId === row.id ? (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => confirmDelete(row)}
                    disabled={loading}
                    title={um.confirm}
                    className={cn(actionButton, "border-success/40 text-success hover:bg-success/10")}
                  >
                    <Check className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(null)}
                    disabled={loading}
                    title={um.cancel}
                    className={cn(actionButton, "border-destructive/40 text-destructive hover:bg-destructive/10")}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDialogUser(row)}
                    disabled={loading}
                    title={um.edit}
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
                    title={um.delete}
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
            {um.totalUsers}:{" "}
            <span className="font-extrabold tabular-nums text-foreground">
              {formatNumber(summary.count)}
            </span>
          </p>
          <p>
            {um.activeUsers}:{" "}
            <span className="font-bold tabular-nums text-success">
              {formatNumber(summary.activeCount)}
            </span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} loading={loading}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {um.refresh}
        </Button>
      </footer>

      {dialogUser !== undefined && (
        <UserDialog
          key={dialogUser?.id ?? "new"}
          user={dialogUser}
          onClose={() => setDialogUser(undefined)}
          onSuccess={handleDialogSuccess}
        />
      )}
    </div>
  );
}
