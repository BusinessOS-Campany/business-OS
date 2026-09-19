"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Plus,
  Search,
  X,
  Trash2,
  Package,
  ArrowRight,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Truck,
} from "lucide-react";
import type { AppCurrency } from "@/lib/format";
import { formatQty } from "@/lib/format";

type TransferStatus = "DRAFT" | "REQUESTED" | "APPROVED" | "SHIPPED" | "RECEIVED" | "CANCELLED" | "REJECTED";

interface TransferRow {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  fromName: string;
  toName: string;
  status: TransferStatus;
  itemCount: number;
  note: string;
  createdAt: string;
  approvedAt: string | null;
  receivedAt: string | null;
  createdByName: string;
  approvedByName: string;
  receivedByName: string;
}

interface TProduct {
  id: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  cost: number;
  warehouseStock: Map<string, number> | undefined;
}

interface Line {
  productId: string;
  name: string;
  sku: string;
  qty: string;
}

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

const STATUS_STYLE: Record<TransferStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  REQUESTED: "bg-sky-500/10 text-sky-600",
  APPROVED: "bg-violet-500/10 text-violet-600",
  SHIPPED: "bg-blue-500/10 text-blue-600",
  RECEIVED: "bg-emerald-500/10 text-emerald-600",
  CANCELLED: "bg-destructive/10 text-destructive",
  REJECTED: "bg-destructive/10 text-destructive",
};

export function TransfersClient({
  lang,
  currency,
  defaultFromWarehouseId,
  warehouses,
  products,
  transfers,
}: {
  lang: "ar" | "en";
  currency: AppCurrency;
  defaultFromWarehouseId: string | null;
  warehouses: { id: string; name: string }[];
  products: TProduct[];
  transfers: TransferRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showNew, setShowNew] = useState(false);
  const [fromId, setFromId] = useState(defaultFromWarehouseId ?? "");
  const [toId, setToId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transfers.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (q && !`${t.fromName} ${t.toName} ${t.createdByName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transfers, search, statusFilter]);

  const productMatches = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => `${p.nameAr} ${p.nameEn} ${p.sku}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [products, productQuery]);

  const totalQty = lines.reduce((s, l) => s + num(l.qty), 0);

  function addLine(p: TProduct) {
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === p.id);
      if (existing) return ls.map((l) => (l.productId === p.id ? { ...l, qty: String(num(l.qty) + 1) } : l));
      return [...ls, { productId: p.id, name: p.nameAr || p.nameEn, sku: p.sku, qty: "1" }];
    });
    setProductQuery("");
  }

  function removeLine(productId: string) {
    setLines((ls) => ls.filter((l) => l.productId !== productId));
  }

  function openNew() {
    setShowNew(true);
    setFromId(defaultFromWarehouseId ?? "");
    setToId("");
    setLines([]);
    setNote("");
    setError("");
  }

  async function create() {
    if (busy) return;
    setError("");
    if (!fromId || !toId || fromId === toId) {
      setError(L(lang, "اختر مستودعَي المصدر والوجهة", "Select source and destination warehouses"));
      return;
    }
    if (lines.length === 0) {
      setError(L(lang, "أضف على الأقل منتجاً", "Add at least one product"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/pos/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId: fromId,
          toWarehouseId: toId,
          note,
          items: lines.map((l) => ({ productId: l.productId, quantity: Math.round(num(l.qty) * 1000) })),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(L(lang, "تعذر إنشاء التحويل", "Could not create transfer"));
        return;
      }
      setShowNew(false);
      router.refresh();
    } catch {
      setError(L(lang, "حدث خطأ في الاتصال", "Network error"));
    } finally {
      setBusy(false);
    }
  }

  async function act(t: TransferRow, action: "approve" | "receive" | "cancel", confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/pos/api/transfers/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error === "insufficient_stock" ? L(lang, "مخزون غير كافٍ في مستودع المصدر", "Insufficient stock in source warehouse") : L(lang, "تعذر تنفيذ العملية", "Action failed"));
        return;
      }
      router.refresh();
    } catch {
      setError(L(lang, "حدث خطأ في الاتصال", "Network error"));
    } finally {
      setBusy(false);
    }
  }

  function stockOf(p: TProduct) {
    return p.warehouseStock?.get(fromId) ?? 0;
  }

  function Actions({ t }: { t: TransferRow }) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        {t.status === "REQUESTED" && (
          <button onClick={() => act(t, "approve")} className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 px-2.5 py-1.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-500/10">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {L(lang, "اعتماد", "Approve")}
          </button>
        )}
        {(t.status === "REQUESTED" || t.status === "APPROVED") && (
          <button onClick={() => act(t, "receive", L(lang, "تأكيد استلام التحويل وتحديث المخزون؟", "Confirm receiving this transfer and updating stock?"))} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/10">
            <Truck className="h-3.5 w-3.5" />
            {L(lang, "استلام", "Receive")}
          </button>
        )}
        {(t.status === "REQUESTED" || t.status === "APPROVED") && (
          <button onClick={() => act(t, "cancel", L(lang, "إلغاء التحويل؟", "Cancel this transfer?"))} className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-2.5 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10">
            <Ban className="h-3.5 w-3.5" />
            {L(lang, "إلغاء", "Cancel")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <ArrowLeftRight className="h-5 w-5 text-emerald-600" />
            {L(lang, "التحويلات", "Stock transfers")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "نقل المخزون بين المستودعات", "Move stock between warehouses")}</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          {L(lang, "تحويل جديد", "New transfer")}
        </button>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L(lang, "بحث بالمستودع…", "Search by warehouse…")}
            className="w-full rounded-xl border border-border bg-card py-2 ps-9 pe-3 text-sm outline-none transition focus:border-emerald-500"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="ALL">{L(lang, "كل الحالات", "All statuses")}</option>
          {(["REQUESTED", "APPROVED", "RECEIVED", "CANCELLED"] as const).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "المسار", "Route")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "التاريخ", "Date")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "الكمية", "Qty")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "الحالة", "Status")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "بواسطة", "By")}</th>
                <th className="px-4 py-3 text-end font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    {L(lang, "لا توجد تحويلات", "No transfers")}
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="max-w-32 truncate font-semibold">{t.fromName}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-emerald-600 rtl:rotate-180" />
                        <span className="max-w-32 truncate font-semibold">{t.toName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}
                      {t.note && <p className="max-w-40 truncate">{t.note}</p>}
                    </td>
                    <td className="px-4 py-3 text-end font-semibold">{t.itemCount}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t.receivedByName || (t.approvedByName ? `${t.approvedByName} (${L(lang, "اعتماد", "ap")})` : t.createdByName)}
                    </td>
                    <td className="px-4 py-3"><Actions t={t} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setShowNew(false)}>
          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <ArrowLeftRight className="h-4 w-4 text-emerald-600" />
                {L(lang, "تحويل جديد", "New transfer")}
              </h3>
              <button onClick={() => setShowNew(false)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={L(lang, "من مستودع", "From warehouse")}>
                <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={inputCls}>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={L(lang, "إلى مستودع", "To warehouse")}>
                <select value={toId} onChange={(e) => setToId(e.target.value)} className={inputCls}>
                  <option value="">{L(lang, "— اختر —", "— Select —")}</option>
                  {warehouses.filter((w) => w.id !== fromId).map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                {L(lang, "إضافة منتجات", "Add products")}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder={L(lang, "بحث واختيار…", "Search and select…")}
                  className="w-full rounded-xl border border-border bg-background py-2 ps-9 pe-3 text-sm outline-none transition focus:border-emerald-500"
                />
              </div>
              {productMatches.length > 0 && (
                <div className="mt-1 overflow-hidden rounded-xl border border-border bg-background">
                  {productMatches.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addLine(p)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm transition hover:bg-emerald-500/10"
                    >
                      <span className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {p.nameAr || p.nameEn}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {L(lang, "المخزون", "Stock")}: {formatQty(stockOf(p), lang, 0)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {lines.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-start text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2 text-start font-semibold">{L(lang, "المنتج", "Product")}</th>
                      <th className="px-3 py-2 text-end font-semibold">{L(lang, "الكمية", "Qty")}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lines.map((l) => (
                      <tr key={l.productId}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{l.name}</p>
                          <p className="text-xs text-muted-foreground">{l.sku}</p>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min={0} step="0.001" value={l.qty} onChange={(e) => setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, qty: e.target.value } : x)))} className={`${inputCls} !w-28 text-end`} />
                        </td>
                        <td className="px-3 py-2 text-end">
                          <button onClick={() => removeLine(l.productId)} className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4">
              <Field label={L(lang, "ملاحظات", "Notes")}>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              </Field>
            </div>

            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {L(lang, "الكمية", "Qty")}: <strong className="text-base text-foreground">{formatQty(totalQty, lang, 0)}</strong>
              </p>
              <button onClick={create} disabled={busy} className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                {busy ? L(lang, "جارٍ الإنشاء…", "Creating…") : L(lang, "إنشاء التحويل", "Create transfer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none transition focus:border-emerald-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}