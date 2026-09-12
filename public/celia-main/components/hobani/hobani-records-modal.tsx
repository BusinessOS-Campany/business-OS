"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, List, LoaderCircle, Pencil, Trash2, X, XCircle } from "lucide-react";
import type { HobaniIncomeRecord } from "@/lib/hobani/totals";
import { hobaniPeriodLabel } from "@/lib/hobani/income";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-provider";
import { HobaniIncomeForm } from "@/components/hobani/hobani-income-form";
import { cn } from "@/lib/cn";

interface HobaniRecordsModalProps {
  day: string;
  period: string;
  onClose: () => void;
  onChanged: () => void;
}

const actionButton =
  "inline-flex size-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

export function HobaniRecordsModal({ day, period, onClose, onChanged }: HobaniRecordsModalProps) {
  const { locale, t } = useLocale();
  const ht = t.hobaniTotals;
  const [records, setRecords] = useState<HobaniIncomeRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HobaniIncomeRecord | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/hobani/income?day=${encodeURIComponent(day)}&period=${encodeURIComponent(period)}`,
      );
      const data = (await res.json().catch(() => null)) as {
        records?: HobaniIncomeRecord[];
        error?: string;
      } | null;
      if (res.ok && data?.records) {
        setRecords(data.records);
      } else {
        setError(data?.error ?? ht.serverError);
      }
    } catch {
      setError(ht.serverError);
    }
  }, [day, period, ht.serverError]);

  useEffect(() => {
    let stopped = false;
    const timer = setTimeout(async () => {
      if (stopped) return;
      await load();
    }, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [load]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (editing) {
          setEditing(null);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing, onClose]);

  async function confirmDeleteRecord(record: HobaniIncomeRecord) {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/hobani/income/${record.id}`, {
        method: "DELETE",
        headers: { "Accept-Language": locale },
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? ht.deleteError);
        return;
      }
      setPendingDeleteId(null);
      await load();
      onChanged();
    } catch {
      setError(ht.serverError);
    } finally {
      setDeleting(false);
    }
  }

  function handleEditSuccess() {
    setEditing(null);
    void load();
    onChanged();
  }

  const dayLabel = new Date(`${day}T00:00:00`).toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-GB",
  );
  const periodLabel = hobaniPeriodLabel(period, t);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <List className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-foreground">{ht.recordsTitle}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {periodLabel} • {dayLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ms-auto rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={ht.close}
            title={ht.close}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-y-auto p-5">
          {editing ? (
            <HobaniIncomeForm
              key={editing.id}
              initialData={editing}
              onSuccess={handleEditSuccess}
              onClose={() => setEditing(null)}
            />
          ) : error ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
            >
              <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : records === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              {ht.loadingRecords}
            </div>
          ) : records.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{ht.noRecords}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-150 text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-xs font-bold text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 text-start font-bold">#</th>
                    <th scope="col" className="px-4 py-2.5 text-start font-bold">{ht.colIncome}</th>
                    <th scope="col" className="px-4 py-2.5 text-start font-bold">{ht.colCardType}</th>
                    <th scope="col" className="px-4 py-2.5 text-start font-bold">{ht.colQuantity}</th>
                    <th scope="col" className="px-4 py-2.5 text-start font-bold">{ht.colTime}</th>
                    <th scope="col" className="px-4 py-2.5 text-start font-bold">{ht.colEmployee}</th>
                    <th scope="col" className="px-4 py-2.5 text-end font-bold">{ht.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr
                      key={record.id}
                      className="border-b border-border/60 last:border-b-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold tabular-nums text-foreground">
                        {formatCurrency(record.income)}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">
                        {record.cardType != null
                          ? `${t.hobani.cardLabel} ${record.cardType}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                        {record.quantity}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                        {formatDateTime(record.createdAt, locale)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {record.createdByName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-end">
                        {pendingDeleteId === record.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => confirmDeleteRecord(record)}
                              disabled={deleting}
                              title={ht.confirm}
                              className={cn(actionButton, "border-success/40 text-success hover:bg-success/10")}
                            >
                              <Check className="size-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
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
                              onClick={() => setEditing(record)}
                              disabled={deleting}
                              title={ht.edit}
                              className={actionButton}
                            >
                              <Pencil className="size-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(record.id)}
                              disabled={deleting}
                              title={ht.delete}
                              className={cn(actionButton, "text-destructive hover:bg-destructive/10")}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
