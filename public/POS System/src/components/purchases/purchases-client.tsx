"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  Plus,
  Search,
  X,
  Trash2,
  Eye,
  ShoppingCart,
  Building2,
  Package,
} from "lucide-react";
import type { AppCurrency } from "@/lib/format";
import { formatMoney, formatQty } from "@/lib/format";

interface PurchaseRow {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  notes: string;
  itemCount: number;
  supplierName: string;
  warehouseName: string;
  branchName: string;
  createdByName: string;
}

interface POrderProduct {
  id: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  price: number;
  cost: number;
  type: string;
}

interface Line {
  productId: string;
  name: string;
  sku: string;
  qty: string;
  price: string;
  total: number;
}

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (v: string) => Math.round(num(v) * 100);
const qtyToMin = (v: string) => Math.round(num(v) * 1000);

export function PurchasesClient({
  lang,
  currency,
  mainWarehouseId,
  purchases,
  suppliers,
  warehouses,
  paymentMethods,
  products,
}: {
  lang: "ar" | "en";
  currency: AppCurrency;
  mainWarehouseId: string | null;
  purchases: PurchaseRow[];
  suppliers: { id: string; name: string }[];
  warehouses: { id: string; name: string; isMain: boolean }[];
  paymentMethods: { id: string; name: string; type: string; requiresReference: boolean }[];
  products: POrderProduct[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<PurchaseRow | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState(mainWarehouseId ?? "");
  const [productQuery, setProductQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [methodId, setMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filteredPurchases = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter((p) => `${p.invoiceNo} ${p.supplierName}`.toLowerCase().includes(q));
  }, [purchases, search]);

  const productMatches = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => `${p.nameAr} ${p.nameEn} ${p.sku}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [products, productQuery]);

  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const discountVal = Math.min(subtotal, money(discount));
  const total = subtotal - discountVal;
  const paid = money(paidAmount);

  function addLine(p: POrderProduct) {
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === p.id);
      if (existing) {
        return ls.map((l) =>
          l.productId === p.id
            ? { ...l, qty: String(num(l.qty) + 1), total: Math.round((num(l.qty) + 1) * num(l.price) * 100) / 100 }
            : l
        );
      }
      return [
        ...ls,
        {
          productId: p.id,
          name: p.nameAr || p.nameEn,
          sku: p.sku,
          qty: "1",
          price: p.price.toFixed(2),
          total: 0,
        },
      ];
    });
    setProductQuery("");
  }

  function updateLine(productId: string, key: "qty" | "price", value: string) {
    setLines((ls) =>
      ls.map((l) => {
        if (l.productId !== productId) return l;
        const q = key === "qty" ? value : l.qty;
        const pr = key === "price" ? value : l.price;
        const total = Math.round(num(q) * num(pr) * 100) / 100;
        return { ...l, [key]: value, total };
      })
    );
  }

  function removeLine(productId: string) {
    setLines((ls) => ls.filter((l) => l.productId !== productId));
  }

  function openNew() {
    setShowNew(true);
    setSupplierId("");
    setWarehouseId(mainWarehouseId ?? "");
    setLines([]);
    setDiscount("0");
    setNotes("");
    setPaidAmount("");
    setMethodId(paymentMethods[0]?.id ?? "");
    setReference("");
    setError("");
  }

  async function submit() {
    if (busy) return;
    setError("");
    if (!supplierId) {
      setError(L(lang, "اختر المورد", "Select a supplier"));
      return;
    }
    if (lines.length === 0) {
      setError(L(lang, "أضف على الأقل منتجاً واحداً", "Add at least one product"));
      return;
    }
    if (paid > total) {
      setError(L(lang, "المبلغ المدفوع أكبر من الإجمالي", "Paid amount exceeds total"));
      return;
    }
    setBusy(true);
    try {
      const payload = {
        supplierId,
        warehouseId: warehouseId || null,
        discount: discountVal,
        notes,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: qtyToMin(l.qty),
          price: money(l.price),
        })),
        payments:
          paid > 0
            ? [{ methodId, amount: paid, reference }]
            : [],
      };
      const res = await fetch("/pos/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(apiError(json.error));
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

  function apiError(err: string) {
    if (err === "supplier_not_found") return L(lang, "المورد غير موجود", "Supplier not found");
    if (err === "warehouse_not_found") return L(lang, "المستودع غير موجود", "Warehouse not found");
    if (err?.startsWith("product_not_found")) return L(lang, "منتج غير موجود", "Product not found");
    if (err === "overpaid") return L(lang, "المبلغ المدفوع أكبر من الإجمالي", "Paid amount exceeds total");
    return err;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Truck className="h-5 w-5 text-emerald-600" />
            {L(lang, "المشتريات", "Purchases")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "فواتير الشراء من الموردين", "Purchase invoices from suppliers")}</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          {L(lang, "شراء جديد", "New purchase")}
        </button>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L(lang, "بحث بالفاتورة أو المورد…", "Search by invoice or supplier…")}
            className="w-full rounded-xl border border-border bg-card py-2 ps-9 pe-3 text-sm outline-none transition focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "الفاتورة", "Invoice")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "المورد", "Supplier")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "المستودع", "Warehouse")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "الإجمالي", "Total")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "المدفوع", "Paid")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "المستحق", "Due")}</th>
                <th className="px-4 py-3 text-end font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    {L(lang, "لا توجد مشتريات", "No purchases")}
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold">{p.invoiceNo}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.invoiceDate).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")} · {p.itemCount} {L(lang, "أصناف", "items")}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium">{p.supplierName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.warehouseName}</td>
                    <td className="px-4 py-3 text-end font-semibold">{formatMoney(p.total, currency, lang)}</td>
                    <td className="px-4 py-3 text-end text-emerald-600">{formatMoney(p.paidAmount, currency, lang)}</td>
                    <td className="px-4 py-3 text-end">
                      <span className={`font-bold ${p.dueAmount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {formatMoney(p.dueAmount, currency, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        onClick={() => setView(p)}
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-sky-500/10 hover:text-sky-600"
                        title={L(lang, "عرض", "View")}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View details */}
      {view && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setView(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-mono text-base font-bold">{view.invoiceNo}</h3>
              <button onClick={() => setView(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <Row label={L(lang, "المورد", "Supplier")} value={view.supplierName} />
              <Row label={L(lang, "المستودع", "Warehouse")} value={view.warehouseName} />
              <Row label={L(lang, "التاريخ", "Date")} value={new Date(view.invoiceDate).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")} />
              <Row label={L(lang, "الأصناف", "Items")} value={`${view.itemCount}`} />
              <Row label={L(lang, "الإجمالي", "Total")} value={formatMoney(view.total, currency, lang)} />
              <Row label={L(lang, "المدفوع", "Paid")} value={formatMoney(view.paidAmount, currency, lang)} />
              <Row label={L(lang, "المستحق", "Due")} value={formatMoney(view.dueAmount, currency, lang)} />
              {view.notes && <Row label={L(lang, "ملاحظات", "Notes")} value={view.notes} />}
              <Row label={L(lang, "بواسطة", "By")} value={view.createdByName} />
            </div>
          </div>
        </div>
      )}

      {/* New purchase */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setShowNew(false)}>
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                {L(lang, "شراء جديد", "New purchase")}
              </h3>
              <button onClick={() => setShowNew(false)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label={L(lang, "المورد", "Supplier")} required>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}>
                  <option value="">{L(lang, "— اختر —", "— Select —")}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={L(lang, "المستودع", "Warehouse")}>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute start-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={`${inputCls} ps-9`}>
                    <option value="">—</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field label={L(lang, "الخصم", "Discount")}>
                <MoneyInput value={discount} onChange={setDiscount} currency={currency} lang={lang} />
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
                      <span className="text-xs text-muted-foreground">{formatMoney(p.price, currency, lang)}</span>
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
                      <th className="px-3 py-2 text-end font-semibold">{L(lang, "السعر", "Price")}</th>
                      <th className="px-3 py-2 text-end font-semibold">{L(lang, "الإجمالي", "Total")}</th>
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
                          <input type="number" min={0} step="0.001" value={l.qty} onChange={(e) => updateLine(l.productId, "qty", e.target.value)} className={`${inputCls} !w-24 text-end`} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min={0} step="0.01" value={l.price} onChange={(e) => updateLine(l.productId, "price", e.target.value)} className={`${inputCls} !w-28 text-end`} />
                        </td>
                        <td className="px-3 py-2 text-end font-semibold">{formatMoney(l.total, currency, lang)}</td>
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

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label={L(lang, "المبلغ المدفوع", "Paid amount")}>
                <MoneyInput value={paidAmount} onChange={setPaidAmount} currency={currency} lang={lang} />
              </Field>
              <Field label={L(lang, "طريقة الدفع", "Payment method")}>
                <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className={inputCls}>
                  {paymentMethods.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={L(lang, "المرجع", "Reference")}>
                <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} dir="ltr" placeholder="#12345" />
              </Field>
            </div>

            <Field label={L(lang, "ملاحظات", "Notes")}>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </Field>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <div className="space-y-0.5 text-sm">
                <p className="text-muted-foreground">{L(lang, "الإجمالي", "Total")}: <strong>{formatMoney(subtotal, currency, lang)}</strong></p>
                <p className="text-muted-foreground">{L(lang, "الخصم", "Discount")}: <strong>{formatMoney(discountVal, currency, lang)}</strong></p>
                <p className="text-base font-extrabold">{L(lang, "المستحق", "Due")}: {formatMoney(total - paid, currency, lang)}</p>
              </div>
              <button onClick={submit} disabled={busy} className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                {busy ? L(lang, "جارٍ الحفظ…", "Saving…") : L(lang, "حفظ الشراء", "Save purchase")}
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
    <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none transition focus:border-emerald-500";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  currency,
  lang,
}: {
  value: string;
  onChange: (v: string) => void;
  currency: AppCurrency;
  lang: "ar" | "en";
}) {
  return (
    <div className="relative">
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} min={0} placeholder="0" />
      <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {lang === "ar" ? currency.symbolAr : currency.symbol}
      </span>
    </div>
  );
}