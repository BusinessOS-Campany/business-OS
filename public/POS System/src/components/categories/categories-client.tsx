"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface CategoryRow {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

const PALETTE = ["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#6366f1"];

export function CategoriesClient({ lang, categories }: { lang: "ar" | "en"; categories: CategoryRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<CategoryRow | null>(null);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [sortOrder, setSortOrder] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function openNew() {
    setEdit(null);
    setName("");
    setNameAr("");
    setColor(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    setSortOrder(categories.length);
    setError("");
    setShowForm(true);
  }

  function openEdit(c: CategoryRow) {
    setEdit(c);
    setName(c.name);
    setNameAr(c.nameAr);
    setColor(c.color || PALETTE[0]);
    setSortOrder(c.sortOrder);
    setError("");
    setShowForm(true);
  }

  async function save() {
    if (busy) return;
    setError("");
    if (!name.trim() && !nameAr.trim()) {
      setError(L(lang, "أدخل اسم القسم", "Enter a category name"));
      return;
    }
    setBusy(true);
    try {
      const payload = { name: name.trim() || nameAr.trim(), nameAr: nameAr.trim(), color, sortOrder };
      const res = await fetch(edit ? `/pos/api/categories/${edit.id}` : "/pos/api/categories", {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(L(lang, "حدث خطأ - ربما القسم موجود", "Error - category may already exist"));
        return;
      }
      setShowForm(false);
      router.refresh();
    } catch {
      setError(L(lang, "حدث خطأ في الاتصال", "Network error"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: CategoryRow) {
    const res = await fetch(`/pos/api/categories/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    if (res.ok) router.refresh();
  }

  async function remove(c: CategoryRow) {
    if (c.productCount > 0) {
      setError(L(lang, "لا يمكن حذف قسم يحتوي منتجات", "Cannot delete a category that has products"));
      setTimeout(() => setError(""), 3000);
      return;
    }
    if (!window.confirm(L(lang, `حذف القسم "${c.nameAr || c.name}"؟`, `Delete category "${c.name || c.nameAr}"?`))) return;
    const res = await fetch(`/pos/api/categories/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(L(lang, "تعذر الحذف", "Could not delete"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Layers className="h-5 w-5 text-emerald-600" />
            {L(lang, "الأقسام", "Categories")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "تنظيم المنتجات في أقسام", "Organize products into categories")}</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          {L(lang, "قسم جديد", "New category")}
        </button>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((c) => (
          <div key={c.id} className={`rounded-2xl border border-border bg-card p-4 ${c.isActive ? "" : "opacity-50"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: c.color || "#10b981" }}>
                  {(c.nameAr || c.name).trim().charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{c.nameAr || c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.name || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(c)} title={L(lang, "تفعيل/إيقاف", "Toggle")} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-emerald-500/10 hover:text-emerald-600">
                  {c.isActive ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => openEdit(c)} title={L(lang, "تعديل", "Edit")} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-sky-500/10 hover:text-sky-600">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(c)} title={L(lang, "حذف", "Delete")} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {c.productCount} {L(lang, "منتج", "products")} · {c.isActive ? L(lang, "نشط", "Active") : L(lang, "موقوف", "Inactive")}
            </p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setShowForm(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-bold">
              {edit ? L(lang, "تعديل القسم", "Edit category") : L(lang, "قسم جديد", "New category")}
            </h3>
            <div className="space-y-3">
              <Field label={L(lang, "الاسم عربي", "Arabic name")}>
                <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={inputCls} />
              </Field>
              <Field label={L(lang, "الاسم إنجليزي", "English name")}>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </Field>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{L(lang, "اللون", "Color")}</label>
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full transition ${color === c ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <Field label={L(lang, "الترتيب", "Sort order")}>
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className={inputCls} />
              </Field>
            </div>
            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} disabled={busy} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted/50">
                {L(lang, "إلغاء", "Cancel")}
              </button>
              <button onClick={save} disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}