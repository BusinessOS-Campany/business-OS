"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Search, SlidersHorizontal, Building2, X } from "lucide-react";
import type { AppCurrency } from "@/lib/format";
import { formatQty, formatMoney } from "@/lib/format";

interface Warehouse {
  id: string;
  name: string;
  isMain: boolean;
}

interface InvProduct {
  id: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  minStock: number;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  unitName: string;
  price: number;
  totalStock: number;
  warehouseStock: Map<string, number> | undefined;
}

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

const ADJ_TYPES = ["ADJUSTMENT", "DAMAGE", "LOSS", "EXPIRY"] as const;

export function InventoryClient({
  lang,
  currency,
  canAdjust,
  mainWarehouseId,
  warehouses,
  products,
}: {
  lang: "ar" | "en";
  currency: AppCurrency;
  canAdjust: boolean;
  mainWarehouseId: string | null;
  warehouses: Warehouse[];
  products: InvProduct[];
}) {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState(mainWarehouseId ?? warehouses[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [showAdjust, setShowAdjust] = useState<InvProduct | null>(null);
  const [newQty, setNewQty] = useState("");
  const [type, setType] = useState<(typeof ADJ_TYPES)[number]>("ADJUSTMENT");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const activeWarehouse = warehouses.find((w) => w.id === warehouseId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q) {
        const hay = `${p.nameAr} ${p.nameEn} ${p.sku}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, search]);

  const totalValue = useMemo(
    () => filtered.reduce((sum, p) => sum + p.totalStock * p.price, 0),
    [filtered],
  );
  const lowCount = useMemo(
    () => filtered.filter((p) => p.trackInventory && (p.warehouseStock?.get(warehouseId) ?? 0) <= p.minStock).length,
    [filtered, warehouseId],
  );

  function openAdjust(p: InvProduct) {
    setShowAdjust(p);
    setNewQty(String(p.warehouseStock?.get(warehouseId) ?? 0));
    setType("ADJUSTMENT");
    setReason("");
    setError("");
  }

  async function submitAdjust() {
    if (busy) return;
    setError("");
    const val = parseFloat(newQty);
    if (!Number.isFinite(val) || val < 0) {
      setError(L(lang, "أدخل كمية صحيحة", "Enter a valid quantity"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/pos/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: showAdjust!.id, warehouseId, newQuantity: val, type, reason }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(L(lang, "تعذر تسجيل التعديل", "Could not record adjustment"));
        return;
      }
      setShowAdjust(null);
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
            <Boxes className="h-5 w-5 text-emerald-600" />
            {L(lang, "المخزون", "Inventory")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "متابعة الكميات في المستودعات", "Monitor stock across warehouses")}</p>
        </div>
      </div>

      {/* Warehouse switcher */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {warehouses.map((w) => (
            <button
              key={w.id}
              onClick={() => setWarehouseId(w.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                w.id === warehouseId
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-border bg-card text-muted-foreground hover:border-emerald-400"
              }`}
            >
              <Building2 className="h-4 w-4" />
              {w.name}
              {w.isMain && <span className="text-[10px] opacity-80">• {L(lang, "رئيسي", "Main")}</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-card px-3 py-1.5 font-semibold text-muted-foreground">
            {L(lang, "قيمة", "Value")}: <span className="text-foreground">{formatMoney(totalValue, currency, lang)}</span>
          </span>
          <span className="rounded-full bg-card px-3 py-1.5 font-semibold text-muted-foreground">
            {L(lang, "منخفض", "Low")}: <span className="text-amber-600">{lowCount}</span>
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={L(lang, "بحث بالاسم أو الرمز…", "Search by name or SKU…")}
          className="w-full rounded-xl border border-border bg-card py-2 ps-9 pe-3 text-sm outline-none transition focus:border-emerald-500"
        />
      </div>

      {error && <div className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "المنتج", "Product")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "الوحدة", "Unit")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "في المستودع", "In warehouse")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "الإجمالي", "Total")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "حد إعادة الطلب", "Reorder")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "القيمة", "Value")}</th>
                {canAdjust && <th className="px-4 py-3 text-end font-semibold"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canAdjust ? 7 : 6} className="px-4 py-10 text-center text-muted-foreground">
                    {L(lang, "لا توجد منتجات", "No products")}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const stockHere = p.trackInventory ? p.warehouseStock?.get(warehouseId) ?? 0 : null;
                  const low = p.trackInventory && (stockHere ?? 0) <= p.minStock;
                  return (
                    <tr key={p.id} className="transition hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{p.nameAr || p.nameEn}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.sku || (p.nameEn || p.nameAr)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-end text-muted-foreground">{p.unitName || "—"}</td>
                      <td className="px-4 py-3 text-end">
                        {stockHere === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={`font-bold ${low ? "text-amber-600" : "text-emerald-600"}`}>
                            {formatQty(stockHere, lang, 0)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end text-muted-foreground">
                        {p.trackInventory ? formatQty(p.totalStock, lang, 0) : "—"}
                      </td>
                      <td className="px-4 py-3 text-end text-muted-foreground">
                        {p.trackInventory ? formatQty(p.minStock, lang, 0) : "—"}
                      </td>
                      <td className="px-4 py-3 text-end text-muted-foreground">
                        {p.trackInventory ? formatMoney(p.totalStock * p.price, currency, lang) : "—"}
                      </td>
                      {canAdjust && (
                        <td className="px-4 py-3 text-end">
                          {p.trackInventory && (
                            <button
                              onClick={() => openAdjust(p)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-emerald-500 hover:text-emerald-600"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                              {L(lang, "تعديل", "Adjust")}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdjust && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setShowAdjust(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">
                {L(lang, "تعديل المخزون", "Adjust stock")} — {showAdjust.nameAr || showAdjust.nameEn}
              </h3>
              <button onClick={() => setShowAdjust(null)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {L(lang, "المستودع", "Warehouse")}: <strong className="text-foreground">{activeWarehouse?.name}</strong>
              {" · "}
              {L(lang, "الكمية الحالية", "Current qty")}:{" "}
              <strong className="text-foreground">{formatQty(showAdjust.warehouseStock?.get(warehouseId) ?? 0, lang, 0)}</strong>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                  {L(lang, "الكمية الجديدة", "New quantity")}
                </label>
                <input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} min={0} step="0.001" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{L(lang, "نوع التعديل", "Type")}</label>
                <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputCls}>
                  {ADJ_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{L(lang, "السبب", "Reason")}</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} className={`${inputCls} resize-none`} />
              </div>
            </div>

            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowAdjust(null)} disabled={busy} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted/50">
                {L(lang, "إلغاء", "Cancel")}
              </button>
              <button onClick={submitAdjust} disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                {busy ? L(lang, "جارٍ الحفظ…", "Saving…") : L(lang, "حفظ", "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none transition focus:border-emerald-500";