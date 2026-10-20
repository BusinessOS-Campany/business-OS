"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Search, Eye, X, RotateCcw, Check, Banknote } from "lucide-react";
import type { AppCurrency } from "@/lib/format";
import { formatMoney, formatQty } from "@/lib/format";

type SaleStatus = "COMPLETED" | "REFUNDED" | "PARTIALLY_REFUNDED";

interface SaleItem {
  id: string;
  productId: string | null;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  cost: number;
  total: number;
}

interface SalePayment {
  id: string;
  methodName: string;
  methodType: string;
  amount: number;
  reference: string;
}

interface SaleRow {
  id: string;
  invoiceNo: string;
  type: string;
  status: SaleStatus;
  subtotal: number;
  discount: number;
  discountPercent: number;
  tax: number;
  total: number;
  profit: number;
  paidAmount: number;
  changeAmount: number;
  dueAmount: number;
  notes: string;
  createdAt: string;
  customerId: string | null;
  customerName: string;
  cashierName: string;
  items: SaleItem[];
  payments: SalePayment[];
}

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

const STATUS_STYLE: Record<SaleStatus, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-600",
  REFUNDED: "bg-rose-500/10 text-rose-600",
  PARTIALLY_REFUNDED: "bg-amber-500/10 text-amber-600",
};

interface ReturnLine {
  saleItemId: string;
  name: string;
  productId: string | null;
  maxQty: number;
  qty: string;
  price: number;
}

export function SalesClient({
  lang,
  currency,
  canRefund,
  sales,
}: {
  lang: "ar" | "en";
  currency: AppCurrency;
  canRefund: boolean;
  sales: SaleRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [view, setView] = useState<SaleRow | null>(null);
  const [returnSale, setReturnSale] = useState<SaleRow | null>(null);
  const [rLines, setRLines] = useState<ReturnLine[]>([]);
  const [reason, setReason] = useState("OTHER");
  const [note, setNote] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (q && !`${s.invoiceNo} ${s.customerName} ${s.cashierName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sales, search, statusFilter]);

  function openReturn(s: SaleRow) {
    setReturnSale(s);
    setRLines(
      s.items.map((i) => ({
        saleItemId: i.id,
        name: i.name,
        productId: i.productId,
        maxQty: i.quantity,
        qty: String(i.quantity),
        price: i.price,
      }))
    );
    setReason("OTHER");
    setNote("");
    setRefundMethod("CASH");
    setRestock(true);
    setError("");
  }

  const returnTotal = rLines.reduce((sum, l) => sum + Math.round(num(l.qty) * l.price * 100) / 100, 0);

  async function submitReturn() {
    if (busy) return;
    setError("");
    const items = rLines.filter((l) => num(l.qty) > 0 && l.maxQty > 0);
    if (items.length === 0) {
      setError(L(lang, "حدد كميات المرتجع", "Select return quantities"));
      return;
    }
    for (const l of items) {
      if (num(l.qty) > l.maxQty) {
        setError(L(lang, "الكمية المرتجعة أكبر من المباعة", "Return quantity exceeds sold quantity"));
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch("/pos/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: returnSale!.id,
          reason,
          note,
          refundMethod,
          restock,
          items: items.map((l) => ({ saleItemId: l.saleItemId, quantity: Math.round(num(l.qty) * 1000) })),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(L(lang, "تعذر تسجيل المرتجع", "Could not record return"));
        return;
      }
      setReturnSale(null);
      router.refresh();
    } catch {
      setError(L(lang, "حدث خطأ في الاتصال", "Network error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Receipt className="h-5 w-5 text-emerald-600" />
            {L(lang, "سجل المبيعات", "Sales history")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "فواتير المبيعات والمرتجعات", "Sales invoices and returns")}</p>
        </div>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L(lang, "بحث بالفاتورة أو العميل…", "Search by invoice or customer…")}
            className="w-full rounded-xl border border-border bg-card py-2 ps-9 pe-3 text-sm outline-none transition focus:border-emerald-500"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="ALL">{L(lang, "كل الحالات", "All statuses")}</option>
          <option value="COMPLETED">{L(lang, "مكتمل", "Completed")}</option>
          <option value="PARTIALLY_REFUNDED">{L(lang, "مرتجع جزئياً", "Partially refunded")}</option>
          <option value="REFUNDED">{L(lang, "مرتجع", "Refunded")}</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "الفاتورة", "Invoice")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "العميل", "Customer")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "الإجمالي", "Total")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "المدفوع", "Paid")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "المتبقي", "Due")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "الحالة", "Status")}</th>
                <th className="px-4 py-3 text-end font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    {L(lang, "لا توجد مبيعات", "No sales")}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold">{s.invoiceNo}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")} · {s.items.reduce((a, i) => a + i.quantity, 0)} {L(lang, "أصناف", "items")}
                      </p>
                    </td>
                    <td className="px-4 py-3">{s.customerName || <span className="text-muted-foreground">{L(lang, "عميل عام", "Walk-in")}</span>}</td>
                    <td className="px-4 py-3 text-end font-semibold">{formatMoney(s.total, currency, lang)}</td>
                    <td className="px-4 py-3 text-end text-emerald-600">{formatMoney(s.paidAmount, currency, lang)}</td>
                    <td className="px-4 py-3 text-end">
                      <span className={`font-bold ${s.dueAmount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {formatMoney(s.dueAmount, currency, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[s.status]}`}>
                        {s.status === "COMPLETED" ? L(lang, "مكتمل", "Completed") : s.status === "REFUNDED" ? L(lang, "مرتجع", "Refunded") : L(lang, "مرتجع جزئياً", "Partial")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        onClick={() => setView(s)}
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-sky-500/10 hover:text-sky-600"
                        title={L(lang, "عرض", "View")}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canRefund && s.status !== "REFUNDED" && (
                        <button
                          onClick={() => openReturn(s)}
                          className="ms-1 rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
                          title={L(lang, "مرتجع", "Return")}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View sale */}
      {view && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setView(null)}>
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-mono text-base font-bold">{view.invoiceNo}</h3>
                <p className="text-xs text-muted-foreground">{view.customerName || "—"} · {new Date(view.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</p>
              </div>
              <button onClick={() => setView(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-start text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">{L(lang, "المنتج", "Product")}</th>
                    <th className="px-3 py-2 text-end font-semibold">{L(lang, "كمية", "Qty")}</th>
                    <th className="px-3 py-2 text-end font-semibold">{L(lang, "السعر", "Price")}</th>
                    <th className="px-3 py-2 text-end font-semibold">{L(lang, "الإجمالي", "Total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {view.items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2 font-medium">{i.name}</td>
                      <td className="px-3 py-2 text-end">{formatQty(i.quantity, lang, 0)}</td>
                      <td className="px-3 py-2 text-end">{formatMoney(i.price, currency, lang)}</td>
                      <td className="px-3 py-2 text-end font-semibold">{formatMoney(i.total, currency, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 space-y-1.5 text-sm">
              <Row label={L(lang, "المجموع", "Subtotal")} value={formatMoney(view.subtotal, currency, lang)} />
              {view.discount > 0 && <Row label={`${L(lang, "الخصم", "Discount")}${view.discountPercent > 0 ? ` (${view.discountPercent}%)` : ""}`} value={`- ${formatMoney(view.discount, currency, lang)}`} />}
              <Row label={L(lang, "الإجمالي", "Total")} value={formatMoney(view.total, currency, lang)} />
              <div className="border-t border-border/50 pt-1.5" />
              {view.payments.map((p) => (
                <Row key={p.id} label={p.methodName} value={formatMoney(p.amount, currency, lang)} />
              ))}
              {view.changeAmount > 0 && <Row label={L(lang, "الباقي للعميل", "Change")} value={formatMoney(view.changeAmount, currency, lang)} />}
              {view.dueAmount > 0 && <Row label={L(lang, "المتبقي (آجل)", "Due")} value={formatMoney(view.dueAmount, currency, lang)} />}
              {view.notes && <Row label={L(lang, "ملاحظات", "Notes")} value={view.notes} />}
              <Row label={L(lang, "الكاشير", "Cashier")} value={view.cashierName} />
            </div>
          </div>
        </div>
      )}

      {/* Return modal */}
      {returnSale && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setReturnSale(null)}>
          <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <RotateCcw className="h-4 w-4 text-rose-500" />
                {L(lang, "مرتجع", "Return")} — {returnSale.invoiceNo}
              </h3>
              <button onClick={() => setReturnSale(null)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-start text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">{L(lang, "المنتج", "Product")}</th>
                    <th className="px-3 py-2 text-end font-semibold">{L(lang, "الكمية", "Qty")}</th>
                    <th className="px-3 py-2 text-end font-semibold">{L(lang, "الإجمالي", "Total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rLines.map((l) => (
                    <tr key={l.saleItemId}>
                      <td className="px-3 py-2">
                        <p className="font-medium">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{L(lang, "المباع", "Sold")}: {formatQty(l.maxQty, lang, 0)}</p>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step="0.001" max={l.maxQty} value={l.qty} onChange={(e) => setRLines((ls) => ls.map((x) => (x.saleItemId === l.saleItemId ? { ...x, qty: e.target.value } : x)))} className={`${inputCls} !w-24 text-end`} />
                      </td>
                      <td className="px-3 py-2 text-end font-semibold">{formatMoney(Math.round(num(l.qty) * l.price * 100) / 100, currency, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={L(lang, "سبب المرتجع", "Return reason")}>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
                  {(["DEFECTIVE", "WRONG_ITEM", "EXPIRED", "DAMAGED", "CHANGE_OF_MIND", "OTHER"] as const).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label={L(lang, "طريقة الاسترداد", "Refund method")}>
                <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} className={inputCls}>
                  <option value="CASH">{L(lang, "نقداً", "Cash")}</option>
                  <option value="ORIGINAL_PAYMENT">{L(lang, "طريقة الدفع الأصلية", "Original payment")}</option>
                  <option value="STORE_CREDIT">{L(lang, "رصيد لدى المحل", "Store credit")}</option>
                  <option value="EXCHANGE">{L(lang, "استبدال", "Exchange")}</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label={L(lang, "ملاحظات", "Notes")}>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
                </Field>
              </div>
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-muted-foreground" />{L(lang, "إعادة الرد إلى المخزون", "Restock returned items")}</span>
            </label>

            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Banknote className="h-4 w-4" />
                {L(lang, "قيمة الاسترداد", "Refund")}: <strong className="text-base text-foreground">{formatMoney(returnTotal, currency, lang)}</strong>
              </p>
              <button onClick={submitReturn} disabled={busy || returnTotal <= 0} className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40">
                {busy ? L(lang, "جارٍ الحفظ…", "Saving…") : L(lang, "تسجيل المرتجع", "Save return")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
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