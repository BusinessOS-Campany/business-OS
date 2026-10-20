"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenText, ChevronDown, ChevronUp } from "lucide-react";
import type { AppCurrency } from "@/lib/format";
import { formatMoney } from "@/lib/format";

interface JournalLine {
  id: string;
  debit: number;
  credit: number;
  accountCode: string;
  accountName: string;
}

interface JournalRow {
  id: string;
  entryNo: string;
  refType: string;
  description: string;
  date: string;
  createdByName: string;
  lines: JournalLine[];
}

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

const REF_STYLE: Record<string, string> = {
  SALE: "bg-emerald-500/10 text-emerald-600",
  PURCHASE: "bg-amber-500/10 text-amber-600",
  RETURN: "bg-rose-500/10 text-rose-600",
  PAYMENT: "bg-sky-500/10 text-sky-600",
  EXPENSE: "bg-orange-500/10 text-orange-600",
  ADJUSTMENT: "bg-violet-500/10 text-violet-600",
  OPENING: "bg-slate-500/10 text-slate-600",
  CASH: "bg-teal-500/10 text-teal-600",
};

export function JournalClient({
  lang,
  currency,
  from,
  to,
  type,
  refTypes,
  entries,
}: {
  lang: "ar" | "en";
  currency: AppCurrency;
  from: string;
  to: string;
  type: string;
  refTypes: string[];
  entries: JournalRow[];
}) {
  const router = useRouter();
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const [fFrom, setFFrom] = useState(from);
  const [fTo, setFTo] = useState(to);
  const [fType, setFType] = useState(type);

  function applyFilters() {
    const params = new URLSearchParams();
    if (fFrom) params.set("from", fFrom);
    if (fTo) params.set("to", fTo);
    if (fType && fType !== "ALL") params.set("type", fType);
    const qs = params.toString();
    router.push(qs ? `/journal?${qs}` : "/journal");
  }

  const totals = useMemo(() => {
    let dr = 0;
    let cr = 0;
    for (const e of entries) for (const l of e.lines) {
      dr += l.debit;
      cr += l.credit;
    }
    return { dr, cr };
  }, [entries]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <BookOpenText className="h-5 w-5 text-emerald-600" />
            {L(lang, "دفتر اليومية", "Journal")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "القيود المحاسبية", "Accounting entries")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{L(lang, "من", "From")}</label>
          <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{L(lang, "إلى", "To")}</label>
          <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{L(lang, "النوع", "Type")}</label>
          <select value={fType} onChange={(e) => setFType(e.target.value)} className={inputCls}>
            <option value="ALL">{L(lang, "الكل", "All")}</option>
            {refTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button onClick={applyFilters} className={btnCls}>
          {L(lang, "تصفية", "Filter")}
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">
          {L(lang, "القيود", "Entries")}: <strong>{entries.length}</strong> · {L(lang, "موثقة ومتوازنة", "posted & balanced")}
        </span>
        <span className="flex items-center gap-4">
          <span>{L(lang, "مدين", "Debit")}: <strong className="text-emerald-600">{formatMoney(totals.dr, currency, lang)}</strong></span>
          <span>{L(lang, "دائن", "Credit")}: <strong className="text-amber-600">{formatMoney(totals.cr, currency, lang)}</strong></span>
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{L(lang, "القيد", "Entry")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "البيان", "Description")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "مدين", "Debit")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "دائن", "Credit")}</th>
                <th className="px-4 py-3 text-end font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {L(lang, "لا توجد قيود", "No entries")}
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const dr = e.lines.reduce((s, l) => s + l.debit, 0);
                  const cr = e.lines.reduce((s, l) => s + l.credit, 0);
                  const open = openEntry === e.id;
                  return (
                    <FragmentRow
                      key={e.id}
                      lang={lang}
                      e={e}
                      open={open}
                      dr={dr}
                      cr={cr}
                      currency={currency}
                      onToggle={() => setOpenEntry(open ? null : e.id)}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  lang, e, open, dr, cr, currency, onToggle,
}: {
  lang: "ar" | "en";
  e: JournalRow;
  open: boolean;
  dr: number;
  cr: number;
  currency: AppCurrency;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="cursor-pointer transition hover:bg-muted/30" onClick={onToggle}>
        <td className="px-4 py-3">
          <p className="font-mono text-xs font-bold">{e.entryNo}</p>
          {e.refType && (
            <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${REF_STYLE[e.refType] ?? "bg-muted text-muted-foreground"}`}>
              {e.refType}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <p className="font-medium">{e.description || "—"}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(e.date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")} · {e.createdByName}
          </p>
        </td>
        <td className="px-4 py-3 text-end font-semibold text-emerald-600">{formatMoney(dr, currency, lang)}</td>
        <td className="px-4 py-3 text-end font-semibold text-amber-600">{formatMoney(cr, currency, lang)}</td>
        <td className="px-4 py-3 text-end">
          {open ? <ChevronUp className="ms-auto h-4 w-4 text-muted-foreground" /> : <ChevronDown className="ms-auto h-4 w-4 text-muted-foreground" />}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="bg-muted/20 px-6 py-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-xs uppercase text-muted-foreground">
                  <th className="py-1 font-semibold">{L(lang, "الحساب", "Account")}</th>
                  <th className="py-1 text-end font-semibold">{L(lang, "مدين", "Debit")}</th>
                  <th className="py-1 text-end font-semibold">{L(lang, "دائن", "Credit")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {e.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5">
                      <span className="font-mono text-xs text-muted-foreground">{l.accountCode}</span> {l.accountName}
                    </td>
                    <td className="py-1.5 text-end">{l.debit > 0 ? formatMoney(l.debit, currency, lang) : "—"}</td>
                    <td className="py-1.5 text-end">{l.credit > 0 ? formatMoney(l.credit, currency, lang) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

const inputCls = "rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none transition focus:border-emerald-500";
const btnCls = "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700";