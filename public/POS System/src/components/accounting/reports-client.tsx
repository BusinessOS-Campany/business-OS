"use client";

import { useMemo, useState } from "react";
import { FileBarChart, Search } from "lucide-react";
import type { AppCurrency } from "@/lib/format";
import { formatMoney } from "@/lib/format";

type AccType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

interface ReportRow {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  type: AccType;
  parentId: string | null;
  opening: number;
  debits: number;
  credits: number;
  closing: number;
}

interface Totals {
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  expenses: number;
  dr: number;
  cr: number;
}

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

const TYPES: { value: AccType; ar: string; en: string }[] = [
  { value: "ASSET", ar: "الأصول", en: "Assets" },
  { value: "LIABILITY", ar: "الالتزامات", en: "Liabilities" },
  { value: "EQUITY", ar: "حقوق الملكية", en: "Equity" },
  { value: "REVENUE", ar: "الإيرادات", en: "Revenue" },
  { value: "EXPENSE", ar: "المصروفات", en: "Expenses" },
];

export function ReportsClient({
  lang,
  currency,
  rows,
  totals,
}: {
  lang: "ar" | "en";
  currency: AppCurrency;
  rows: ReportRow[];
  totals: Totals;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => !q || `${r.code} ${r.name} ${r.nameAr}`.toLowerCase().includes(q));
  }, [rows, search]);

  const byType = useMemo(() => {
    const m = new Map<AccType, ReportRow[]>();
    for (const t of TYPES) m.set(t.value, []);
    for (const r of filtered) m.get(r.type)?.push(r);
    return m;
  }, [filtered]);

  const netIncome = totals.revenue - totals.expenses;
  const balanced = totals.dr === totals.cr;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <FileBarChart className="h-5 w-5 text-emerald-600" />
            {L(lang, "التقارير المالية", "Financial reports")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "ميزان المراجعة ونتائج التشغيل", "Trial balance and operating results")}</p>
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card label={L(lang, "الأصول", "Assets")} value={totals.assets} currency={currency} lang={lang} cls="text-emerald-600" />
        <Card label={L(lang, "الالتزامات", "Liabilities")} value={totals.liabilities} currency={currency} lang={lang} cls="text-amber-600" />
        <Card label={L(lang, "حقوق الملكية", "Equity")} value={totals.equity} currency={currency} lang={lang} cls="text-violet-600" />
        <Card label={L(lang, "الإيرادات", "Revenue")} value={totals.revenue} currency={currency} lang={lang} cls="text-sky-600" />
        <Card label={L(lang, "المصروفات", "Expenses")} value={totals.expenses} currency={currency} lang={lang} cls="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <span className="text-sm text-muted-foreground">{L(lang, "صافي الربح", "Net income")}</span>
          <span className="text-base font-extrabold text-emerald-600">{formatMoney(netIncome, currency, lang)}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <span className="text-sm text-muted-foreground">{L(lang, "إجمالي مدين", "Total debits")}</span>
          <span className="text-base font-bold">{formatMoney(totals.dr, currency, lang)}</span>
        </div>
        <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${balanced ? "border-border bg-card" : "border-rose-500/40 bg-rose-500/5"}`}>
          <span className="text-sm text-muted-foreground">{L(lang, "إجمالي دائن", "Total credits")}</span>
          <span className="text-base font-bold">{formatMoney(totals.cr, currency, lang)}{balanced && <span className="ms-2 text-xs font-semibold text-emerald-600">✓</span>}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {TYPES.map((t) => {
          const list = byType.get(t.value) ?? [];
          if (list.length === 0) return null;
          const dr = list.reduce((s, r) => s + r.debits, 0);
          const cr = list.reduce((s, r) => s + r.credits, 0);
          return (
            <div key={t.value} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="text-sm font-bold">{L(lang, t.ar, t.en)}</span>
                <span className="text-xs text-muted-foreground">
                  {L(lang, "مدين", "Dr")}: {formatMoney(dr, currency, lang)} · {L(lang, "دائن", "Cr")}: {formatMoney(cr, currency, lang)}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">{L(lang, "الحساب", "Account")}</th>
                    <th className="px-4 py-2 text-end font-semibold">{L(lang, "الافتتاحي", "Opening")}</th>
                    <th className="px-4 py-2 text-end font-semibold">{L(lang, "مدين", "Debit")}</th>
                    <th className="px-4 py-2 text-end font-semibold">{L(lang, "دائن", "Credit")}</th>
                    <th className="px-4 py-2 text-end font-semibold">{L(lang, "الرصيد", "Balance")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {list.map((r) => (
                    <tr key={r.id} className="transition hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs text-muted-foreground">{r.code}</span> {L(lang, r.nameAr || r.name, r.name || r.nameAr)}
                        {r.parentId && <span className="ms-1 text-[10px] text-muted-foreground">▸</span>}
                      </td>
                      <td className="px-4 py-2 text-end">{formatMoney(r.opening, currency, lang)}</td>
                      <td className="px-4 py-2 text-end text-emerald-600">{formatMoney(r.debits, currency, lang)}</td>
                      <td className="px-4 py-2 text-end text-amber-600">{formatMoney(r.credits, currency, lang)}</td>
                      <td className="px-4 py-2 text-end font-bold">{formatMoney(r.closing, currency, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({ label, value, currency, lang, cls }: { label: string; value: number; currency: AppCurrency; lang: "ar" | "en"; cls: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-bold ${cls}`}>{formatMoney(value, currency, lang)}</p>
    </div>
  );
}