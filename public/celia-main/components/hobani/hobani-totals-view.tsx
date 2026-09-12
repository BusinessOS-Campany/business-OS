"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, XCircle } from "lucide-react";
import type { HobaniTotalRow } from "@/lib/hobani/totals";
import { useLocale } from "@/lib/i18n/locale-provider";
import { HobaniTotalsTable } from "@/components/hobani/hobani-totals-table";
import { HobaniIncomeForm } from "@/components/hobani/hobani-income-form";
import { HobaniRecordsModal } from "@/components/hobani/hobani-records-modal";
import { Button } from "@/components/ui/button";

interface HobaniTotalsViewProps {
  initialRows: HobaniTotalRow[];
}

export function HobaniTotalsView({ initialRows }: HobaniTotalsViewProps) {
  const { locale, t } = useLocale();
  const ht = t.hobaniTotals;
  const [rows, setRows] = useState<HobaniTotalRow[]>(initialRows);
  const [formOpen, setFormOpen] = useState(false);
  const [details, setDetails] = useState<HobaniTotalRow | null>(null);
  const [message, setMessage] = useState<{ type: "error"; text: string } | null>(null);

  useEffect(() => {
    document.body.style.overflow = formOpen || details ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [formOpen, details]);

  useEffect(() => {
    if (!formOpen && !details) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFormOpen(false);
        setDetails(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formOpen, details]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/hobani/totals");
      if (res.ok) {
        const data = (await res.json()) as { rows: (Omit<HobaniTotalRow, "day"> & { day: string })[] };
        setRows(data.rows.map((r) => ({ ...r, day: new Date(r.day) })));
      }
    } catch {
      // keep current rows on failure
    }
  }, []);

  function closeForm() {
    setFormOpen(false);
  }

  function handleFormSuccess() {
    void refresh();
    closeForm();
  }

  function handleRecordsChanged() {
    void refresh();
  }

  async function confirmDeleteGroup(row: HobaniTotalRow): Promise<boolean> {
    setMessage(null);
    try {
      const res = await fetch("/api/hobani/income", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({ day: row.dayKey, period: row.period }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? ht.deleteError });
        return false;
      }
      await refresh();
      return true;
    } catch {
      setMessage({ type: "error", text: ht.serverError });
      return false;
    }
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
        <Button variant="primary" size="md" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          {ht.addIncome}
        </Button>
      </div>

      <HobaniTotalsTable
        initialRows={rows}
        onDetails={setDetails}
        onDeleteGroup={confirmDeleteGroup}
      />

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
            <HobaniIncomeForm onSuccess={handleFormSuccess} onClose={closeForm} />
          </div>
        </div>
      )}

      {details && (
        <HobaniRecordsModal
          day={details.dayKey}
          period={details.period}
          onClose={() => setDetails(null)}
          onChanged={handleRecordsChanged}
        />
      )}
    </div>
  );
}
