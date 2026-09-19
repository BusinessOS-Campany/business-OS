"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, ReceiptText, X } from "lucide-react";

export interface ReceivableRow { id: string; name: string; phone: string; balance: number; creditLimit: number }
export interface PayableRow { id: string; name: string; phone: string; payable: number }
interface Method { id: string; name: string; type: string }

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

export function CreditClient({
  lang, canCredit, canPurchase, receivableRows, payableRows, methods,
}: {
  lang: "ar" | "en"; canCredit: boolean; canPurchase: boolean;
  receivableRows: ReceivableRow[]; payableRows: PayableRow[]; methods: Method[];
}) {
  const router = useRouter();
  const [payTarget, setPayTarget] = useState<{ kind: "customer" | "supplier"; id: string; name: string; max: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ amount: "", methodId: "", note: "" });

  async function submit() {
    if (!payTarget || busy) return;
    setError("");
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setError(L(lang, "أدخل مبلغاً صحيحاً", "Enter a valid amount"));
      return;
    }
    if (amount > payTarget.max) {
      setError(L(lang, "المبلغ أكبر من الرصيد المستحق", "Amount exceeds the outstanding balance"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        payTarget.kind === "customer" ? `/api/customers/${payTarget.id}/payment` : `/api/suppliers/${payTarget.id}/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, amount, methodId: form.methodId || undefined }),
        }
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error === "over_payment" ? L(lang, "المبلغ أكبر من الرصيد المستحق", "Amount exceeds the outstanding balance") : L(lang, "تعذر الحفظ", "Could not save"));
        return;
      }
      setPayTarget(null);
      setForm({ amount: "", methodId: "", note: "" });
      router.refresh();
    } catch {
      setError(L(lang, "حدث خطأ في الاتصال", "Network error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <HandCoins className="h-5 w-5 text-emerald-600" />
          {L(lang, "الذمم المدينة والدائنة", "Credit & Debt")}
        </h2>
        <p className="text-sm text-muted-foreground">{L(lang, "تحصيل مستحقات العملاء وتسوية مستحقات الموردين", "Collect from customers and settle suppliers")}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <ReceiptText className="h-4 w-4" />
            {L(lang, "مستحقات العملاء", "Customer receivables")}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">{L(lang, "العميل", "Customer")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{L(lang, "المستحق", "Balance")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{L(lang, "حد الائتمان", "Limit")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {receivableRows.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">{L(lang, "لا توجد مستحقات", "No receivables")}</td></tr>
                ) : receivableRows.map((c) => (
                  <tr key={c.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-end font-bold text-amber-600">{c.balance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-end text-muted-foreground">{c.creditLimit > 0 ? c.creditLimit.toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 text-end">
                      {canCredit && (
                        <button onClick={() => { setPayTarget({ kind: "customer", id: c.id, name: c.name, max: c.balance }); setForm({ amount: "", methodId: "", note: "" }); setError(""); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                          {L(lang, "تحصيل", "Collect")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <HandCoins className="h-4 w-4" />
            {L(lang, "مستحقات الموردين", "Supplier payables")}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">{L(lang, "المورد", "Supplier")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{L(lang, "المستحق", "Due")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payableRows.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">{L(lang, "لا توجد مستحقات", "No payables")}</td></tr>
                ) : payableRows.map((s) => (
                  <tr key={s.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-end font-bold text-rose-600">{s.payable.toLocaleString()}</td>
                    <td className="px-4 py-3 text-end">
                      {canPurchase && (
                        <button onClick={() => { setPayTarget({ kind: "supplier", id: s.id, name: s.name, max: s.payable }); setForm({ amount: "", methodId: "", note: "" }); setError(""); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                          {L(lang, "تسوية", "Pay")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setPayTarget(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-bold">{payTarget.kind === "customer" ? L(lang, "تحصيل من عميل", "Collect from customer") : L(lang, "تسوية مورد", "Settle supplier")}</h3>
              <button onClick={() => setPayTarget(null)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-4 text-sm font-medium">{payTarget.name} — {L(lang, "المستحق", "due")}: {payTarget.max.toLocaleString()}</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{L(lang, "المبلغ", "Amount")}</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{L(lang, "وسيلة الدفع", "Method")}</label>
                <select value={form.methodId} onChange={(e) => setForm({ ...form, methodId: e.target.value })} className={inputCls}>
                  <option value="">{L(lang, "نقداً", "Cash")}</option>
                  {methods.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{L(lang, "ملاحظة", "Note")}</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputCls} />
              </div>
            </div>
            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
            <button onClick={submit} disabled={busy} className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
              {busy ? L(lang, "جارٍ الحفظ…", "Saving…") : L(lang, "تأكيد", "Confirm")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none transition focus:border-emerald-500";