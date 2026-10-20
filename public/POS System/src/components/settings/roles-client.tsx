"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Plus, Pencil, Trash2, X, Lock } from "lucide-react";

interface RoleRow {
  id: string; name: string; nameAr: string; description: string;
  isSystem: boolean; userCount: number; permissionKeys: string[];
}
interface PermOpt { key: string; group: string; label: string }

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

export function RolesClient({
  lang, canManage, roles, permissions,
}: {
  lang: "ar" | "en"; canManage: boolean; roles: RoleRow[]; permissions: PermOpt[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", nameAr: "", description: "", keys: [] as string[] });

  const groups = Array.from(new Set(permissions.map((p) => p.group)));

  function openNew() {
    setForm({ name: "", nameAr: "", description: "", keys: [] });
    setModal({});
    setError("");
  }
  function openEdit(r: RoleRow) {
    setForm({ name: r.name, nameAr: r.nameAr, description: r.description, keys: r.permissionKeys });
    setModal({ id: r.id });
    setError("");
  }

  function toggleKey(key: string) {
    setForm((f) => ({ ...f, keys: f.keys.includes(key) ? f.keys.filter((k) => k !== key) : [...f.keys, key] }));
  }

  async function save() {
    if (busy) return;
    setError("");
    if (!form.name && !form.nameAr) {
      setError(L(lang, "أدخل اسم الدور", "Enter role name"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(modal!.id ? `/pos/api/roles/${modal!.id}` : "/pos/api/roles", {
        method: modal!.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error === "name_exists" ? L(lang, "اسم الدور مستخدم", "Role name already exists") : L(lang, "تعذر الحفظ", "Could not save"));
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

  async function remove(r: RoleRow) {
    if (!confirm(L(lang, `حذف الدور ${r.nameAr || r.name}؟`, `Delete role ${r.nameAr || r.name}?`))) return;
    const res = await fetch(`/pos/api/roles/${r.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(L(lang, "لا يمكن حذف الدور: نظامي أو مرتبط بمستخدمين", "Cannot delete: system role or has users"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            {L(lang, "الأدوار والصلاحيات", "Roles & permissions")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "دورات الوصول للمستخدمين", "User access roles")}</p>
        </div>
        {canManage && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            {L(lang, "دور جديد", "New role")}
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-border bg-card px-4 py-10 text-center text-muted-foreground">
            {L(lang, "لا توجد أدوار", "No roles")}
          </div>
        ) : roles.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {r.isSystem ? <Lock className="h-4 w-4 text-amber-500" /> : <ShieldCheck className="h-4 w-4 text-emerald-600" />}
                <div>
                  <p className="font-bold">{L(lang, r.nameAr || r.name, r.name || r.nameAr)}</p>
                  <p className="text-xs text-muted-foreground">{r.description || r.name}</p>
                </div>
              </div>
              {canManage && !r.isSystem && (
                <div className="flex">
                  <button onClick={() => openEdit(r)} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-sky-500/10 hover:text-sky-600"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(r)} className="ms-0.5 rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {r.permissionKeys.map((k) => (
                <span key={k} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{k}</span>
              ))}
              {r.permissionKeys.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{r.userCount} {L(lang, "مستخدم", "user(s)")}</p>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setModal(null)}>
          <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">{modal.id ? L(lang, "تعديل دور", "Edit role") : L(lang, "دور جديد", "New role")}</h3>
              <button onClick={() => setModal(null)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={L(lang, "الاسم (عربي)", "Name (AR)")}><input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "الاسم (إنجليزي)", "Name (EN)")}><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
              <div className="col-span-2">
                <Field label={L(lang, "الوصف", "Description")}><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} /></Field>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{L(lang, "الصلاحيات", "Permissions")}</p>
              {groups.map((g) => (
                <div key={g} className="rounded-xl border border-border p-3">
                  <p className="mb-2 text-xs font-bold">{g}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {permissions.filter((p) => p.group === g).map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => toggleKey(p.key)}
                        className={`rounded-lg border px-2 py-1.5 text-left text-xs font-medium transition ${
                          form.keys.includes(p.key) ? "border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300" : "border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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