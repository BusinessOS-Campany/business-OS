"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Package, Pencil, Plus, RefreshCw, Trash2, X, XCircle } from "lucide-react";
import type { ProductSaleRow } from "@/lib/products/queries";
import type { ProductOption } from "@/lib/sales/products";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-provider";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { AddProductForm } from "@/components/sales/add-product-form";

interface ProductsViewProps {
  initialRows: ProductSaleRow[];
  products: ProductOption[];
}

const actionButton =
  "inline-flex size-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

export function ProductsView({ initialRows, products }: ProductsViewProps) {
  const { locale, t } = useLocale();
  const p = t.products;
  const [rows, setRows] = useState<ProductSaleRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductSaleRow | null>(null);
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

  function openEdit(row: ProductSaleRow) {
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
      const res = await fetch("/api/sales", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { rows: ProductSaleRow[] };
        setRows(data.rows);
      }
    } catch {
      // keep current rows on failure
    } finally {
      setLoading(false);
    }
  }, []);

  async function confirmDelete(row: ProductSaleRow) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/sales/${row.id}`, {
        method: "DELETE",
        headers: { "Accept-Language": locale },
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? t.addProduct.deleteError });
      } else {
        setPendingDeleteId(null);
        await refresh();
      }
    } catch {
      setMessage({ type: "error", text: t.addProduct.serverError });
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
          {p.addSale}
        </Button>
      </div>

      <DataTable
        rows={rows}
        title={
          <span className="flex items-center gap-2">
            {p.tableTitle}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              {formatNumber(rows.length)}
            </span>
          </span>
        }
        keyOf={(row) => row.id}
        searchText={(row) => `${row.name} ${row.category}`}
        labels={t.dataTable}
        empty={
          <span className="flex flex-col items-center gap-3 py-4">
            <Package className="size-10 text-muted-foreground/50" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">{p.noData}</span>
          </span>
        }
        columns={[
          {
            header: p.name,
            cell: (row) => (
              <span className="text-sm font-bold text-foreground">{row.name}</span>
            ),
          },
          {
            header: p.model,
            cell: (row) => <span className="text-sm text-foreground">{row.category}</span>,
          },
          {
            header: p.finalPrice,
            cell: (row) => (
              <span className="text-sm tabular-nums text-foreground">{formatCurrency(row.finalPrice)}</span>
            ),
          },
          {
            header: p.date,
            cell: (row) => (
              <span className="text-sm text-muted-foreground">
                {formatDateTime(row.createdAt, locale)}
              </span>
            ),
          },
          {
            header: p.actions,
            className: "text-end",
            cell: (row) =>
              pendingDeleteId === row.id ? (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => confirmDelete(row)}
                    disabled={loading}
                    title={p.confirm}
                    className={cn(actionButton, "border-success/40 text-success hover:bg-success/10")}
                  >
                    <Check className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(null)}
                    disabled={loading}
                    title={p.cancel}
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
                    title={p.edit}
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
                    title={p.delete}
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
          {p.tableTitle}:{" "}
          <span className="font-extrabold tabular-nums text-foreground">
            {formatNumber(rows.length)}
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={refresh} loading={loading}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {p.refresh}
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
            <AddProductForm
              key={editing?.id ?? "new"}
              products={products}
              sale={editing}
              onSuccess={handleFormSuccess}
              onClose={closeForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}
