"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search, Eye, X } from "lucide-react";
import type { AppCurrency } from "@/lib/format";
import { formatMoney, formatQty } from "@/lib/format";

interface ReturnItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReturnRow {
  id: string;
  returnNo: string;
  invoiceNo: string;
  reason: string;
  refundMethod: string;
  refundAmount: number;
  createdAt: string;
  note: string;
  customerName: string;
  createdByName: string;
  items: ReturnItem[];
}

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

const REASON: Record<string, [string, string]> = {
  DEFECTIVE: ["معيب", "Defective"],
  WRONG_ITEM: ["صنف خاطئ", "Wrong item"],
  EXPIRED: ["منتهي الصلاحية", "Expired"],
  DAMAGED: ["تالف", "Damaged"],
  CHANGE_OF_MIND: ["تغير الرأي", "Change of mind"],
  OTHER: ["أخرى", "Other"],
};

const METHOD: Record<string, [string, string]> = {
  CASH: ["نقداً", "Cash"],
  ORIGINAL_PAYMENT: ["طريقة الدفع الأصلية", "Original payment"],
  STORE_CREDIT: ["رصيد لدى المحل", "Store credit"],
  EXCHANGE: ["استبدال", "Exchange"],
};

export function ReturnsClient({
  lang,
  currency,
  returns,
}: {
  lang: "ar" | "en";
  currency: AppCurrency;
  returns: ReturnRow[];
}) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ReturnRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns.filter((r) => !q || `${r.returnNo} ${r.invoiceNo} ${r.customerName}`.toLowerCase().includes(q));
  }, [returns, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <RotateCcw className="h-5 w-5 text-rose-500" />
            {L(lang, "المرتجعات", "Returns")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "سجل مرتجعات المبيعات", "Sales returns history")}</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L(lang, "بحث…", "Search…")}
            className="w-56 rounded-xl border border-border bg-card py-2 ps-9 pe-3 text-sm outline-none transition focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "المرتجع", "Return")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "الفاتورة", "Invoice")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "العميل", "Customer")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "المبلغ", "Amount")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "السبب", "Reason")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "الاسترداد", "Refund")}</th>
                <th className="px-4 py-3 text-end font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    {L(lang, "لا توجد مرتجعات", "No returns")}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-rose-600">{r.returnNo}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")} · {r.createdByName}</p>
                    </td>
                    <td className="px-4 py-3 font-mono">{r.invoiceNo}</td>
                    <td className="px-4 py-3">{r.customerName || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-end font-bold">{formatMoney(r.refundAmount, currency, lang)}</td>
                    <td className="px-4 py-3">{REASON[r.reason]?.[lang === "ar" ? 0 : 1] ?? r.reason}</td>
                    <td className="px-4 py-3">{METHOD[r.refundMethod]?.[lang === "ar" ? 0 : 1] ?? r.refundMethod}</td>
                    <td className="px-4 py-3 text-end">
                      <button onClick={() => setView(r)} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-sky-500/10 hover:text-sky-600">
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

      {view && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setView(null)}>
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-mono text-base font-bold text-rose-600">{view.returnNo}</h3>
                <p className="text-xs text-muted-foreground">{L(lang, "الفاتورة", "Invoice")}: {view.invoiceNo} · {new Date(view.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</p>
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

            <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{L(lang, "العميل", "Customer")}: <span className="text-foreground">{view.customerName || "—"}</span></p>
                <p>{L(lang, "السبب", "Reason")}: <span className="text-foreground">{REASON[view.reason]?.[lang === "ar" ? 0 : 1] ?? view.reason}</span></p>
                <p>{L(lang, "طريقة الاسترداد", "Refund")}: <span className="text-foreground">{METHOD[view.refundMethod]?.[lang === "ar" ? 0 : 1] ?? view.refundMethod}</span></p>
                {view.note && <p>{view.note}</p>}
              </div>
              <div className="text-end">
                <p className="text-[11px] font-semibold text-muted-foreground">{L(lang, "قيمة الاسترداد", "Refund amount")}</p>
                <p className="text-lg font-extrabold text-rose-600">{formatMoney(view.refundAmount, currency, lang)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}