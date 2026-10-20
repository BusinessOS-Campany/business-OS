"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Pencil, Trash2, Search, X } from "lucide-react";
import type { AppCurrency } from "@/lib/format";
import { formatMoney } from "@/lib/format";

type AccType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

interface AccountRow {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  type: AccType;
  isSystem: boolean;
  isActive: boolean;
  parentId: string | null;
  openingBalance: number;
  balance: number;
  childCount: number;
  lineCount: number;
}

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

const TYPES: { value: AccType; ar: string; en: string }[] = [
  { value: "ASSET", ar: "أصول", en: "Assets" },
  { value: "LIABILITY", ar: "التزامات", en: "Liabilities" },
  { value: "EQUITY", ar: "حقوق الملكية", en: "Equity" },
  { value: "REVENUE", ar: "إيرادات", en: "Revenue" },
  { value: "EXPENSE", ar: "مصروفات", en: "Expenses" },
];

const TYPE_STYLE: Record<AccType, string> = {
  ASSET: "bg-emerald-500/10 text-emerald-600",
  LIABILITY: "bg-amber-500/10 text-amber-600",
  EQUITY: "bg-violet-500/10 text-violet-600",
  REVENUE: "bg-sky-500/10 text-sky-600",
  EXPENSE: "bg-rose-500/10 text-rose-600",
};

export function ChartClient({
  lang,
  currency,
  canManage,
  accounts,
}: {
  lang: "ar" | "en";
  currency: AppCurrency;
  canManage: boolean;
  accounts: AccountRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [form, setForm] = useState({ code: "", name: "", nameAr: "", type: "ASSET" as AccType, parentId: "", isActive: true, isSystem: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts
      .filter((a) => (typeFilter === "ALL" ? true : a.type === typeFilter))
      .filter((a) => !q || `${a.code} ${a.name} ${a.nameAr}`.toLowerCase().includes(q));
  }, [accounts, search, typeFilter]);

  const byType = useMemo(() => {
    const groups = new Map<AccType, AccountRow[]>();
    for (const t of TYPES) groups.set(t.value, []);
    for (const a of filtered) groups.get(a.type)?.push(a);
    return groups;
  }, [filtered]);

  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const parentOptions = useMemo(() => accounts.filter((a) => a.type !== "REVENUE" && a.type !== "EXPENSE"), [accounts]);

  const totals = useMemo(() => {
    const t = new Map<AccType, number>();
    for (const tg of TYPES) t.set(tg.value, 0);
    for (const a of filtered) t.set(a.type, (t.get(a.type) ?? 0) + a.balance);
    return t;
  }, [filtered]);

  function openNew() {
    setForm({ code: "", name: "", nameAr: "", type: "ASSET", parentId: "", isActive: true, isSystem: false });
    setModal({});
    setError("");
  }

  function openEdit(a: AccountRow) {
    setForm({ code: a.code, name: a.name, nameAr: a.nameAr, type: a.type, parentId: a.parentId ?? "", isActive: a.isActive, isSystem: a.isSystem });
    setModal({ id: a.id });
    setError("");
  }

  async function save() {
    if (busy) return;
    setError("");
    if (!form.code.trim() || (!form.name.trim() && !form.nameAr.trim())) {
      setError(L(lang, "أدخل الكود والاسم", "Enter code and name"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(modal!.id ? `/pos/api/chart-accounts/${modal!.id}` : "/pos/api/chart-accounts", {
        method: modal!.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          nameAr: form.nameAr.trim(),
          type: form.type,
          parentId: form.parentId || null,
          isActive: form.isActive,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error === "code_exists" ? L(lang, "الكود مستخدم مسبقاً", "Code already exists") : L(lang, "تعذر الحفظ", "Could not save"));
        return;
      }
      setModal(null);
      router.refresh();
    } catch {
      setError(L(lang, "حدث خطأ في الاتصال", "Network error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(a: AccountRow) {
    if (!confirm(L(lang, `حذف الحساب ${a.code}؟`, `Delete account ${a.code}?`))) return;
    const res = await fetch(`/pos/api/chart-accounts/${a.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(json.error === "in_use" ? L(lang, "لا يمكن الحذف: يحتوي على حركات أو حساباته فرعية", "Cannot delete: has transactions or children") : L(lang, "تعذر الحذف", "Cannot delete"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            {L(lang, "دليل الحسابات", "Chart of accounts")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "الحسابات المالية وأرصدتها", "Financial accounts and balances")}</p>
        </div>
        {canManage && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            {L(lang, "حساب جديد", "New account")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {TYPES.map((t) => (
          <div key={t.value} className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">{L(lang, t.ar, t.en)}</p>
            <p className="mt-1 text-sm font-bold">{formatMoney(totals.get(t.value) ?? 0, currency, lang)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L(lang, "بحث…", "Search…")}
            className="w-full rounded-xl border border-border bg-card py-2 ps-9 pe-3 text-sm outline-none transition focus:border-emerald-500"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-emerald-500">
          <option value="ALL">{L(lang, "كل الأنواع", "All types")}</option>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{L(lang, t.ar, t.en)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {TYPES.filter((t) => (byType.get(t.value)?.length ?? 0) > 0).map((t) => (
          <div key={t.value} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="flex items-center gap-2 text-sm font-bold">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[t.value]}`}>{L(lang, t.ar, t.en)}</span>
                <span className="text-xs text-muted-foreground">({byType.get(t.value)?.length ?? 0})</span>
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{L(lang, "الرصيد", "Balance")}</span>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border/60">
                {byType.get(t.value)?.map((a) => {
                  const parent = a.parentId ? byId.get(a.parentId) : null;
                  return (
                    <tr key={a.id} className="transition hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <p className="flex items-center gap-2 font-medium">
                          <span className="font-mono text-xs text-muted-foreground">{a.code}</span>
                          {L(lang, a.nameAr || a.name, a.name || a.nameAr)}
                          {a.isSystem && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">SYS</span>}
                          {!a.isActive && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{L(lang, "موقوف", "Inactive")}</span>}
                        </p>
                        {parent && <p className="text-xs text-muted-foreground">{L(lang, "أصل", "Parent")}: {parent.code} {L(lang, parent.nameAr || parent.name, parent.name || parent.nameAr)}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-end">
                        <p className="font-semibold">{formatMoney(a.balance, currency, lang)}</p>
                        {a.openingBalance !== 0 && <p className="text-xs text-muted-foreground">{L(lang, "افتتاحي", "Opening")}: {formatMoney(a.openingBalance, currency, lang)}</p>}
                      </td>
                      <td className="px-2 py-2.5 text-end whitespace-nowrap">
                        {canManage && (
                          <>
                            <button onClick={() => openEdit(a)} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-sky-500/10 hover:text-sky-600" title={L(lang, "تعديل", "Edit")}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {!a.isSystem && a.childCount === 0 && (
                              <button onClick={() => remove(a)} className="ms-1 rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600" title={L(lang, "حذف", "Delete")}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setModal(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">{modal.id ? L(lang, "تعديل حساب", "Edit account") : L(lang, "حساب جديد", "New account")}</h3>
              <button onClick={() => setModal(null)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={L(lang, "الكود", "Code")}>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="1000" className={inputCls} />
              </Field>
              <Field label={L(lang, "النوع", "Type")}>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccType })} className={inputCls} disabled={form.isSystem}>
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{L(lang, t.ar, t.en)}</option>
                  ))}
                </select>
              </Field>
              <Field label={L(lang, "الاسم (عربي)", "Name (AR)")}>
                <input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className={inputCls} />
              </Field>
              <Field label={L(lang, "الاسم (إنجليزي)", "Name (EN)")}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              </Field>
              <div className="col-span-2">
                <Field label={L(lang, "الحساب الأب", "Parent account")}>
                  <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={inputCls}>
                    <option value="">{L(lang, "— بدون (حساب رئيسي)", "— None (top-level)")}</option>
                    {parentOptions.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} · {L(lang, a.nameAr || a.name, a.name || a.nameAr)}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
                {L(lang, "الحساب نشط", "Account active")}
              </label>
            </div>

            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}

            <button onClick={save} disabled={busy} className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
              {busy ? L(lang, "جارٍ الحفظ…", "Saving…") : L(lang, "حفظ", "Save")}
            </button>
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