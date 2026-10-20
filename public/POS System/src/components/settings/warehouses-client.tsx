"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Warehouse, Plus, Pencil, Trash2, Star, X } from "lucide-react";

interface WhRow {
  id: string; name: string; nameAr: string; code: string; address: string;
  phone: string; managerName: string; isMain: boolean; status: string; skuCount: number;
}

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

export function WarehousesClient({
  lang, canManage, warehouses,
}: {
  lang: "ar" | "en"; canManage: boolean; warehouses: WhRow[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [form, setForm] = useState({ name: "", nameAr: "", code: "", address: "", phone: "", managerName: "", isMain: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function openNew() {
    setForm({ name: "", nameAr: "", code: "", address: "", phone: "", managerName: "", isMain: warehouses.length === 0 });
    setModal({});
    setError("");
  }
  function openEdit(w: WhRow) {
    setForm({ name: w.name, nameAr: w.nameAr, code: w.code, address: w.address, phone: w.phone, managerName: w.managerName, isMain: w.isMain });
    setModal({ id: w.id });
    setError("");
  }

  async function save() {
    if (busy) return;
    setError("");
    if (!form.name && !form.nameAr) {
      setError(L(lang, "أدخل اسم المخزن", "Enter warehouse name"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(modal!.id ? `/pos/api/warehouses/${modal!.id}` : "/pos/api/warehouses", {
        method: modal!.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  async function remove(w: WhRow) {
    if (!confirm(L(lang, `حذف المخزن ${w.code}؟`, `Delete warehouse ${w.code}?`))) return;
    const res = await fetch(`/pos/api/warehouses/${w.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(json.error === "in_use" ? L(lang, "لا يمكن الحذف: يوجد عليه مخزون أو حركات", "Cannot delete: has stock or movements") : L(lang, "تعذر الحذف", "Cannot delete"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Warehouse className="h-5 w-5 text-emerald-600" />
            {L(lang, "المخازن", "Warehouses")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "مخازن الشركة", "Company warehouses")}</p>
        </div>
        {canManage && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            {L(lang, "مخزن جديد", "New warehouse")}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{L(lang, "المخزن", "Warehouse")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "المدير", "Manager")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "أصناف", "SKUs")}</th>
                <th className="px-4 py-3 text-end font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {warehouses.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">{L(lang, "لا توجد مخازن", "No warehouses")}</td></tr>
              ) : warehouses.map((w) => (
                <tr key={w.id} className="transition hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 font-semibold">
                      {L(lang, w.nameAr || w.name, w.name || w.nameAr)}
                      {w.isMain && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    </p>
                    <p className="text-xs text-muted-foreground">#{w.code} · {w.phone || w.address || "—"}</p>
                  </td>
                  <td className="px-4 py-3">{w.managerName || "—"}</td>
                  <td className="px-4 py-3 text-end">{w.skuCount}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    {canManage && (
                      <>
                        <button onClick={() => openEdit(w)} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-sky-500/10 hover:text-sky-600"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => remove(w)} className="ms-1 rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setModal(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">{modal.id ? L(lang, "تعديل مخزن", "Edit warehouse") : L(lang, "مخزن جديد", "New warehouse")}</h3>
              <button onClick={() => setModal(null)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={L(lang, "الاسم (عربي)", "Name (AR)")}><input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "الاسم (إنجليزي)", "Name (EN)")}><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "الكود", "Code")}><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "الهاتف", "Phone")}><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></Field>
              <div className="col-span-2">
                <Field label={L(lang, "المدير", "Manager")}><input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} className={inputCls} /></Field>
              </div>
              <div className="col-span-2">
                <Field label={L(lang, "العنوان", "Address")}><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} /></Field>
              </div>
              <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isMain} onChange={(e) => setForm({ ...form, isMain: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
                {L(lang, "المخزن الرئيسي", "Main warehouse")}
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