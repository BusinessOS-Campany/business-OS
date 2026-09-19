"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Eye, CheckCircle, X, Trash2, Send, PackageCheck, Ban, ChevronDown } from "lucide-react";

export interface PORow { id: string; orderNo: string; status: string; total: number; expectedAt: string | null; createdAt: string; supplierName: string; branchName: string }
export interface POItemRow { id: string; productId: string; name: string; sku: string; quantity: number; price: number; total: number; receivedQty: number }
interface Opt { id: string; name: string }
interface ProductOpt extends Opt { sku: string }
interface Detail extends PORow { items: POItemRow[] }

const STATUSCls: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground", PENDING: "bg-amber-500/10 text-amber-600",
  APPROVED: "bg-blue-500/10 text-blue-600", RECEIVED: "bg-emerald-500/10 text-emerald-600",
  PARTIALLY_RECEIVED: "bg-orange-500/10 text-orange-600", CANCELLED: "bg-rose-500/10 text-rose-600",
};

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

export function PurchaseOrdersClient({
  lang, orders, orderDetails, suppliers, branches, products, warehouses, methods,
}: {
  lang: "ar" | "en"; orders: PORow[]; orderDetails: Detail[];
  suppliers: Opt[]; branches: Opt[]; products: ProductOpt[]; warehouses: Opt[]; methods: Opt[];
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ supplierId: "", branchId: "", warehouseId: "", expectedAt: "", notes: "" });
  const [items, setItems] = useState<{ productId: string; quantity: string; price: string }[]>([{ productId: "", quantity: "", price: "" }]);

  function addItem() { setItems([...items, { productId: "", quantity: "", price: "" }]); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, key: string, val: string) { const copy = [...items]; (copy[i] as Record<string, string>)[key] = val; setItems(copy); }

  const linesTotal = items.reduce((acc, it) => {
    const qty = parseFloat(it.quantity || "0");
    const price = parseFloat(it.price || "0");
    return acc + (isNaN(qty) || isNaN(price) ? 0 : qty * price);
  }, 0);

  async function createOrder() {
    if (busy) return;
    setError("");
    if (!form.supplierId || !form.branchId) { setError(L(lang, "اختر المورد والفرع", "Select supplier and branch")); return; }
    const parsedItems = items.map((it) => ({ productId: it.productId, quantity: parseFloat(it.quantity || "0"), price: parseFloat(it.price || "0") }));
    if (parsedItems.some((i) => !i.productId || isNaN(i.quantity) || i.quantity <= 0 || isNaN(i.price) || i.price < 0)) {
      setError(L(lang, "أكمل تفاصيل الأصناف", "Complete item details")); return;
    }
    setBusy(true);
    try {
      const res = await fetch("/pos/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expectedAt: form.expectedAt || undefined, items: parsedItems }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error === "invalid_fields" ? L(lang, "بيانات غير صحيحة", "Invalid data") : L(lang, "تعذر الإنشاء", "Could not create")); return; }
      setCreateOpen(false);
      setForm({ supplierId: "", branchId: "", warehouseId: "", expectedAt: "", notes: "" });
      setItems([{ productId: "", quantity: "", price: "" }]);
      router.refresh();
    } catch { setError(L(lang, "حدث خطأ في الاتصال", "Network error")); }
    finally { setBusy(false); }
  }

  async function action(id: string, act: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/pos/api/purchase-orders/${id}/${act === "receive" ? "receive" : "status"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: act === "receive" ? "" : JSON.stringify({ action: act }),
      });
      setDetail(null);
      router.refresh();
    } catch {}
    finally { setBusy(false); }
  }

  async function del(id: string) {
    if (busy) return;
    setBusy(true);
    try { await fetch(`/pos/api/purchase-orders/${id}`, { method: "DELETE" }); setDetail(null); router.refresh(); }
    catch {}
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            {L(lang, "طلبات الشراء", "Purchase Orders")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "إنشاء واستلام طلبات الشراء", "Create and receive purchase orders")}</p>
        </div>
        <button onClick={() => { setCreateOpen(true); setError(""); }} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" />{L(lang, "طلب جديد", "New order")}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{L(lang, "الرقم", "#")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "المورد", "Supplier")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "الحالة", "Status")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "الإجمالي", "Total")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">{L(lang, "لا توجد طلبات", "No orders")}</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} className="cursor-pointer transition hover:bg-muted/30" onClick={() => setDetail(orderDetails.find((d) => d.id === o.id) ?? null)}>
                  <td className="px-4 py-3 font-bold">{o.orderNo}</td>
                  <td className="px-4 py-3">{o.supplierName}</td>
                  <td className="px-4 py-3"><span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${STATUSCls[o.status] ?? ""}`}>{o.status}</span></td>
                  <td className="px-4 py-3 text-end">{o.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-end"><Eye className="h-4 w-4 text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <Modal title={L(lang, "طلب شراء جديد", "New purchase order")} onClose={() => setCreateOpen(false)} busy={busy}>
          <Field label={L(lang, "المورد", "Supplier")}>
            <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className={inputCls}>
              <option value="">—</option>{suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </Field>
          <Field label={L(lang, "الفرع", "Branch")}>
            <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className={inputCls}>
              {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </Field>
          <Field label={L(lang, "المستودع", "Warehouse")}>
            <select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} className={inputCls}>
              <option value="">—</option>{warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
            </select>
          </Field>
          <Field label={L(lang, "التاريخ المتوقع", "Expected date")}>
            <input type="date" value={form.expectedAt} onChange={(e) => setForm({ ...form, expectedAt: e.target.value })} className={inputCls} />
          </Field>
          <Field label={L(lang, "ملاحظة", "Note")}>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
          </Field>

          <div className="mt-3">
            <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">{L(lang, "الأصناف", "Items")}</p>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_110px_28px] gap-1.5">
                  <select value={it.productId} onChange={(e) => updateItem(i, "productId", e.target.value)} className={inputCls}>
                    <option value="">—</option>{products.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.sku})</option>))}
                  </select>
                  <input type="number" value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} placeholder={L(lang, "الكمية", "Qty")} className={inputCls} />
                  <input type="number" value={it.price} onChange={(e) => updateItem(i, "price", e.target.value)} placeholder={L(lang, "السعر", "Price")} className={inputCls} />
                  <button onClick={() => removeItem(i)} disabled={items.length <= 1} className="rounded p-1 text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              <Plus className="h-3.5 w-3.5" />{L(lang, "إضافة صنف", "Add item")}
            </button>
            <p className="mt-2 text-right text-sm font-bold">{L(lang, "الإجمالي", "Total")}: {linesTotal.toLocaleString()}</p>
          </div>

          {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
          <button onClick={createOrder} disabled={busy} className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
            {busy ? L(lang, "جارٍ الحفظ…", "Saving…") : L(lang, "حفظ كمسودة", "Save as draft")}
          </button>
        </Modal>
      )}

      {/* Detail Modal */}
      {detail && (
        <Modal title={detail.orderNo} onClose={() => setDetail(null)} busy={busy}>
          <div className="mb-3 flex flex-wrap gap-3 text-sm">
            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${STATUSCls[detail.status] ?? ""}`}>{detail.status}</span>
            <span className="text-muted-foreground">{L(lang, "المورد", "Supplier")}: <strong className="text-foreground">{detail.supplierName}</strong></span>
            <span className="text-muted-foreground">{L(lang, "الفرع", "Branch")}: <strong className="text-foreground">{detail.branchName}</strong></span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[520px] text-xs">
              <thead><tr className="border-b border-border bg-muted/50 text-start uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">SKU</th><th className="px-3 py-2 font-semibold">{L(lang, "الصنف", "Item")}</th>
                <th className="px-3 py-2 text-end font-semibold">{L(lang, "الكمية", "Qty")}</th>
                <th className="px-3 py-2 text-end font-semibold">{L(lang, "السعر", "Price")}</th>
                <th className="px-3 py-2 text-end font-semibold">{L(lang, "الإجمالي", "Total")}</th>
                <th className="px-3 py-2 text-end font-semibold">{L(lang, "مستلم", "Rcvd")}</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {detail.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{it.sku}</td>
                    <td className="px-3 py-2">{it.name}</td>
                    <td className="px-3 py-2 text-end">{it.quantity.toLocaleString()}</td>
                    <td className="px-3 py-2 text-end">{it.price.toLocaleString()}</td>
                    <td className="px-3 py-2 text-end font-bold">{it.total.toLocaleString()}</td>
                    <td className="px-3 py-2 text-end">{it.receivedQty.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-right text-sm font-bold">{L(lang, "الإجمالي", "Total")}: {detail.total.toLocaleString()}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {detail.status === "DRAFT" && (
              <>
                <ActionBtn color="amber" icon={<Send className="h-4 w-4" />} label={L(lang, "إرسال", "Submit")} onClick={() => action(detail.id, "submit")} busy={busy} />
                <ActionBtn color="rose" icon={<Trash2 className="h-4 w-4" />} label={L(lang, "حذف", "Delete")} onClick={() => del(detail.id)} busy={busy} />
              </>
            )}
            {detail.status === "PENDING" && (
              <>
                <ActionBtn color="blue" icon={<CheckCircle className="h-4 w-4" />} label={L(lang, "اعتماد", "Approve")} onClick={() => action(detail.id, "approve")} busy={busy} />
                <ActionBtn color="rose" icon={<Ban className="h-4 w-4" />} label={L(lang, "إلغاء", "Cancel")} onClick={() => action(detail.id, "cancel")} busy={busy} />
              </>
            )}
            {(detail.status === "APPROVED" || detail.status === "PARTIALLY_RECEIVED") && (
              <ActionBtn color="emerald" icon={<PackageCheck className="h-4 w-4" />} label={L(lang, "استلام", "Receive")} onClick={() => action(detail.id, "receive")} busy={busy} />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, busy, children }: { title: string; onClose: () => void; busy: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onClose} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ActionBtn({ color, icon, label, onClick, busy }: { color: string; icon: React.ReactNode; label: string; onClick: () => void; busy: boolean }) {
  const cls: Record<string, string> = { amber: "bg-amber-600 hover:bg-amber-700", blue: "bg-blue-600 hover:bg-blue-700", rose: "bg-rose-600 hover:bg-rose-700", emerald: "bg-emerald-600 hover:bg-emerald-700" };
  return <button onClick={onClick} disabled={busy} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${cls[color]} disabled:opacity-40`}>{icon}{label}</button>;
}

const inputCls = "w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none transition focus:border-emerald-500";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</label>{children}</div>;
}