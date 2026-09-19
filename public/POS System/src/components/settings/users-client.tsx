"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Pencil, Trash2, X, Shield, KeyRound } from "lucide-react";

interface UserRow {
  id: string; name: string; username: string | null; email: string; phone: string;
  language: string; status: string; lastLoginAt: string | null; branchName: string;
  roles: { id: string; name: string }[];
}
interface Opt { id: string; name: string }

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

export function UsersClient({
  lang, canManage, users, roles, branches, selfId,
}: {
  lang: "ar" | "en"; canManage: boolean; users: UserRow[]; roles: Opt[]; branches: Opt[]; selfId: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", nameAr: "", username: "", email: "", phone: "", password: "",
    language: "ar", branchId: "", roleIds: [] as string[], status: "ACTIVE",
  });

  function openNew() {
    setForm({ name: "", nameAr: "", username: "", email: "", phone: "", password: "", language: "ar", branchId: "", roleIds: [], status: "ACTIVE" });
    setModal({});
    setError("");
  }
  function openEdit(u: UserRow) {
    setForm({
      name: u.name, nameAr: "", username: u.username ?? "", email: u.email, phone: u.phone, password: "",
      language: u.language, branchId: "", roleIds: u.roles.map((r) => r.id), status: u.status,
    });
    setModal({ id: u.id });
    setError("");
  }

  function toggleRole(id: string) {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(id) ? f.roleIds.filter((x) => x !== id) : [...f.roleIds, id],
    }));
  }

  async function save() {
    if (busy) return;
    setError("");
    if (!form.name && !form.nameAr) {
      setError(L(lang, "أدخل الاسم", "Enter name"));
      return;
    }
    if (!form.username && !form.email) {
      setError(L(lang, "أدخل اسم المستخدم أو البريد", "Enter username or email"));
      return;
    }
    if (!modal!.id && form.password.length < 6) {
      setError(L(lang, "كلمة المرور 6 أحرف على الأقل", "Password must be at least 6 characters"));
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name || form.nameAr,
        nameAr: form.nameAr,
        username: form.username || null,
        email: form.email,
        emailVerified: form.email ? new Date().toISOString() : undefined,
        phone: form.phone,
        language: form.language,
        branchId: form.branchId || null,
        roleIds: form.roleIds,
        status: form.status,
      };
      if (form.password) body.password = form.password;
      const res = await fetch(modal!.id ? `/pos/api/users/${modal!.id}` : "/pos/api/users", {
        method: modal!.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        if (json.error === "email_exists") setError(L(lang, "البريد مستخدم مسبقاً", "Email already exists"));
        else if (json.error === "username_exists") setError(L(lang, "اسم المستخدم مستخدم", "Username already taken"));
        else setError(L(lang, "تعذر الحفظ", "Could not save"));
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

  async function remove(u: UserRow) {
    if (u.id === selfId) {
      alert(L(lang, "لا يمكن حذف حسابك", "Cannot delete your own account"));
      return;
    }
    if (!confirm(L(lang, `حذف المستخدم ${u.name}؟`, `Delete user ${u.name}?`))) return;
    const res = await fetch(`/pos/api/users/${u.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(json.error === "in_use" ? L(lang, "لا يمكن الحذف: للمستخدم سجلات", "Cannot delete: user has records") : L(lang, "تعذر الحذف", "Cannot delete"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Users className="h-5 w-5 text-emerald-600" />
            {L(lang, "المستخدمون", "Users")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "مستخدمي الشركة وصلاحياتهم", "Company users and roles")}</p>
        </div>
        {canManage && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            {L(lang, "مستخدم جديد", "New user")}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{L(lang, "المستخدم", "User")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "الحالة", "Status")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "الدور", "Roles")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "آخر دخول", "Last login")}</th>
                <th className="px-4 py-3 text-end font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">{L(lang, "لا يوجد مستخدمون", "No users")}</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="transition hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}{u.username ? ` · @${u.username}` : ""}{u.branchName ? ` · ${u.branchName}` : ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    {u.status === "ACTIVE" ? (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">{L(lang, "نشط", "Active")}</span>
                    ) : u.status === "INACTIVE" ? (
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600">{L(lang, "معطل", "Inactive")}</span>
                    ) : (
                      <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-600">{L(lang, "موقوف", "Suspended")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : u.roles.map((r) => (
                        <span key={r.id} className="rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">{r.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-end text-muted-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    {canManage && (
                      <>
                        <button onClick={() => openEdit(u)} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-sky-500/10 hover:text-sky-600"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => remove(u)} className="ms-1 rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
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
          <div className="w-full max-w-lg rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">{modal.id ? L(lang, "تعديل مستخدم", "Edit user") : L(lang, "مستخدم جديد", "New user")}</h3>
              <button onClick={() => setModal(null)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={L(lang, "الاسم (عربي)", "Name (AR)")}><input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "الاسم (إنجليزي)", "Name (EN)")}><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "اسم المستخدم", "Username")}><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "البريد", "Email")}><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "الهاتف", "Phone")}><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "الفرع", "Branch")}>
                <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className={inputCls}>
                  <option value="">—</option>
                  {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                </select>
              </Field>
              <Field label={L(lang, "اللغة", "Language")}>
                <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputCls}>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label={L(lang, "الحالة", "Status")}>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </Field>
              {!modal.id && (
                <div className="col-span-2">
                  <Field label={L(lang, "كلمة المرور", "Password")}>
                    <div className="relative">
                      <KeyRound className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${inputCls} ps-8`} placeholder="••••••••" />
                    </div>
                  </Field>
                </div>
              )}
              <div className="col-span-2">
                <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">{L(lang, "الأدوار", "Roles")}</label>
                <div className="flex flex-wrap gap-1.5">
                  {roles.length === 0 ? <p className="text-xs text-muted-foreground">{L(lang, "أنشئ أدواراً أولاً", "Create roles first")}</p> : roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                        form.roleIds.includes(r.id) ? "border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300" : "border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Shield className="h-3 w-3" />
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
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