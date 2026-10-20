"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Plus, X, CheckCircle2, XCircle, Trash2, FolderPlus } from "lucide-react";

interface ExpRow {
  id: string; expenseNo: string; amount: number; date: string; description: string;
  status: string; methodName: string; methodType: string; categoryName: string;
  branchName: string; createdByName: string; approvedByName: string; approvedAt: string | null;
}
interface Opt { id: string; name: string }
interface MethodOpt { id: string; name: string; type: string }

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

export function ExpensesClient({
  lang, expenses, categories, branches, methods,
}: {
  lang: "ar" | "en"; expenses: ExpRow[]; categories: Opt[]; branches: Opt[]; methods: MethodOpt[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    branchId: "", categoryId: "", amount: "", date: "", description: "", methodId: "", status: "PENDING",
  });
  const [catForm, setCatForm] = useState({ name: "", nameAr: "" });

  function openNew() {
    setForm({
      branchId: branches[0]?.id ?? "", categoryId: categories[0]?.id ?? "",
      amount: "", date: new Date().toISOString().slice(0, 10), description: "",
      methodId: `__CASH__`, status: "PENDING",
    });
    setModal(true);
    setError("");
  }

  async function save() {
    if (busy) return;
    setError("");
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError(L(lang, "أدخل مبلغاً صحيحاً", "Enter a valid amount"));
      return;
    }
    setBusy(true);
    try {
      const method = form.methodId === "__CASH__" ? "" : form.methodId;
      const res = await fetch("/pos/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount, methodId: method, date: form.date ? new Date(form.date).toISOString() : undefined }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(L(lang, "تعذر الحفظ", "Could not save"));
        return;
      }
      setModal(false);
      router.refresh();
    } catch {
      setError(L(lang, "حدث خطأ في الاتصال", "Network error"));
    } finally {
      setBusy(false);
    }
  }

  async function addCategory() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/pos/api/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error === "name_exists" ? L(lang, "اسم التصنيف مستخدم", "Category name exists") : L(lang, "تعذر الحفظ", "Could not save"));
        return;
      }
      setCatModal(false);
      setCatForm({ name: "", nameAr: "" });
      router.refresh();
    } catch {
      setError(L(lang, "حدث خطأ في الاتصال", "Network error"));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(e: ExpRow, status: string) {
    const res = await fetch(`/pos/api/expenses/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.error === "invalid_state" ? L(lang, "حالة غير صالحة", "Invalid state") : L(lang, "تعذر التنفيذ", "Could not update"));
      return;
    }
    router.refresh();
  }

  async function remove(e: ExpRow) {
    if (!confirm(L(lang, `حذف المصروف ${e.expenseNo}؟`, `Delete expense ${e.expenseNo}?`))) return;
    const res = await fetch(`/pos/api/expenses/${e.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(L(lang, "لا يمكن الحذف بعد الاعتماد", "Cannot delete an approved expense"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Banknote className="h-5 w-5 text-emerald-600" />
            {L(lang, "المصروفات", "Expenses")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "المصاريف التشغيلية", "Operating expenses")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setCatModal(true); setError(""); }} className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted/50">
            <FolderPlus className="h-4 w-4" />
            {L(lang, "تصنيف", "Category")}
          </button>
          <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            {L(lang, "مصروف جديد", "New expense")}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{L(lang, "الرقم", "No.")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "التاريخ", "Date")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "الوصف", "Description")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "المبلغ", "Amount")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "الحالة", "Status")}</th>
                <th className="px-4 py-3 text-end font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">{L(lang, "لا توجد مصاريف", "No expenses")}</td></tr>
              ) : expenses.map((e) => (
                <tr key={e.id} className="transition hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{e.expenseNo}</p>
                    <p className="text-xs text-muted-foreground">{e.categoryName} · {e.branchName}</p>
                  </td>
                  <td className="px-4 py-3">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <p className="max-w-[260px] truncate">{e.description || "—"}</p>
                    <p className="text-xs text-muted-foreground">{e.methodName}</p>
                  </td>
                  <td className="px-4 py-3 text-end font-bold">{e.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {(e.status === "APPROVED" || e.status === "PAID") ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3 w-3" />{L(lang, "معتمد", "Approved")}</span>
                    ) : e.status === "REJECTED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-600"><XCircle className="h-3 w-3" />{L(lang, "مرفوض", "Rejected")}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600">{L(lang, "قيد الانتظار", "Pending")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    {e.status === "PENDING" && (
                      <>
                        <button onClick={() => setStatus(e, "APPROVED")} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-emerald-500/10 hover:text-emerald-600" title={L(lang, "اعتماد", "Approve")}><CheckCircle2 className="h-4 w-4" /></button>
                        <button onClick={() => setStatus(e, "REJECTED")} className="ms-0.5 rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600" title={L(lang, "رفض", "Reject")}><XCircle className="h-4 w-4" /></button>
                        <button onClick={() => remove(e)} className="ms-0.5 rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600" title={L(lang, "حذف", "Delete")}><Trash2 className="h-3.5 w-3.5" /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setModal(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">{L(lang, "مصروف جديد", "New expense")}</h3>
              <button onClick={() => setModal(false)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label={L(lang, "المبلغ", "Amount")}><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="0.00" /></Field>
              <Field label={L(lang, "التاريخ", "Date")}><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "التصنيف", "Category")}>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputCls}>
                  {categories.length === 0 && <option value="">{L(lang, "أنشئ تصنيفاً أولاً", "Create a category first")}</option>}
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={L(lang, "الفرع", "Branch")}>
                  <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className={inputCls}>
                    {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                  </select>
                </Field>
                <Field label={L(lang, "طريقة الدفع", "Method")}>
                  <select value={form.methodId} onChange={(e) => setForm({ ...form, methodId: e.target.value })} className={inputCls}>
                    <option value="__CASH__">Cash</option>
                    {methods.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                  </select>
                </Field>
              </div>
              <Field label={L(lang, "الوصف", "Description")}><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} /></Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.status === "APPROVED"} onChange={(e) => setForm({ ...form, status: e.target.checked ? "APPROVED" : "PENDING" })} className="h-4 w-4 accent-emerald-600" />
                {L(lang, "اعتماد مباشرة", "Approve immediately")}
              </label>
            </div>
            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
            <button onClick={save} disabled={busy} className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
              {busy ? L(lang, "جارٍ الحفظ…", "Saving…") : L(lang, "حفظ", "Save")}
            </button>
          </div>
        </div>
      )}

      {catModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setCatModal(false)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">{L(lang, "تصنيف مصروف", "Expense category")}</h3>
              <button onClick={() => setCatModal(false)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label={L(lang, "الاسم (عربي)", "Name (AR)")}><input value={catForm.nameAr} onChange={(e) => setCatForm({ ...catForm, nameAr: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "الاسم (إنجليزي)", "Name (EN)")}><input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className={inputCls} /></Field>
            </div>
            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
            <button onClick={addCategory} disabled={busy || (!catForm.name && !catForm.nameAr)} className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
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