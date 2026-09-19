"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Plus,
  Search,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  X,
  Check,
  Truck,
  Building2,
  User as UserIcon,
} from "lucide-react";
import type { AppCurrency } from "@/lib/format";
import { formatMoney } from "@/lib/format";

interface SupplierRow {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  companyName: string;
  type: "COMPANY" | "INDIVIDUAL";
  phone: string;
  phoneAlt: string;
  email: string;
  address: string;
  governorate: string;
  district: string;
  contactPerson: string;
  taxNumber: string;
  paymentTerms: string;
  creditLimit: number;
  openingBalance: number;
  notes: string;
  isActive: boolean;
  purchaseCount: number;
  totalPurchases: number;
  totalPaid: number;
  totalDue: number;
  lastPurchaseAt: string | null;
}

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

interface FormState {
  id: string | null;
  nameAr: string;
  nameEn: string;
  companyName: string;
  type: "COMPANY" | "INDIVIDUAL";
  phone: string;
  phoneAlt: string;
  email: string;
  address: string;
  governorate: string;
  district: string;
  contactPerson: string;
  taxNumber: string;
  paymentTerms: string;
  creditLimit: string;
  openingBalance: string;
  notes: string;
}

const emptyForm: FormState = {
  id: null,
  nameAr: "",
  nameEn: "",
  companyName: "",
  type: "COMPANY",
  phone: "",
  phoneAlt: "",
  email: "",
  address: "",
  governorate: "",
  district: "",
  contactPerson: "",
  taxNumber: "",
  paymentTerms: "",
  creditLimit: "",
  openingBalance: "",
  notes: "",
};

export function SuppliersClient({
  lang,
  currency,
  suppliers,
}: {
  lang: "ar" | "en";
  currency: AppCurrency;
  suppliers: SupplierRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (q) {
        const hay = `${s.name} ${s.nameAr} ${s.nameEn} ${s.companyName} ${s.phone} ${s.contactPerson}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [suppliers, search]);

  function openNew() {
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(s: SupplierRow) {
    setForm({
      id: s.id,
      nameAr: s.nameAr,
      nameEn: s.nameEn,
      companyName: s.companyName,
      type: s.type,
      phone: s.phone,
      phoneAlt: s.phoneAlt,
      email: s.email,
      address: s.address,
      governorate: s.governorate,
      district: s.district,
      contactPerson: s.contactPerson,
      taxNumber: s.taxNumber,
      paymentTerms: s.paymentTerms,
      creditLimit: String(s.creditLimit / 100),
      openingBalance: String(s.openingBalance / 100),
      notes: s.notes,
    });
    setError("");
    setShowForm(true);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (busy) return;
    setError("");
    if (!form.nameAr.trim() && !form.nameEn.trim() && !form.companyName.trim()) {
      setError(L(lang, "أدخل اسم المورد", "Enter a supplier name"));
      return;
    }
    setBusy(true);
    try {
      const payload = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        companyName: form.companyName.trim(),
        type: form.type,
        phone: form.phone.trim(),
        phoneAlt: form.phoneAlt.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        governorate: form.governorate.trim(),
        district: form.district.trim(),
        contactPerson: form.contactPerson.trim(),
        taxNumber: form.taxNumber.trim(),
        paymentTerms: form.paymentTerms.trim(),
        creditLimit: Math.round(parseFloat(form.creditLimit || "0") * 100),
        openingBalance: Math.round(parseFloat(form.openingBalance || "0") * 100),
        notes: form.notes.trim(),
      };
      const res = await fetch(form.id ? `/pos/api/suppliers/${form.id}` : "/pos/api/suppliers", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(L(lang, "تعذر الحفظ", "Could not save"));
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

  async function toggleActive(s: SupplierRow) {
    const res = await fetch(`/pos/api/suppliers/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    if (res.ok) router.refresh();
  }

  async function remove(s: SupplierRow) {
    if (s.purchaseCount > 0) {
      setError(L(lang, "لا يمكن حذف مورد لديه مشتريات", "Cannot delete a supplier with purchases"));
      setTimeout(() => setError(""), 3500);
      return;
    }
    if (!window.confirm(L(lang, `حذف المورد "${s.nameAr || s.nameEn || s.name}"؟`, `Delete supplier "${s.nameEn || s.nameAr || s.name}"?`))) return;
    const res = await fetch(`/pos/api/suppliers/${s.id}`, { method: "DELETE" });
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
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
            {L(lang, "الموردون", "Suppliers")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {L(lang, "إدارة الموردين وأرصدتهم", "Manage suppliers and their balances")}
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          {L(lang, "مورد جديد", "New supplier")}
        </button>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">{error}</div>}

      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={L(lang, "بحث بالاسم أو الهاتف…", "Search by name or phone…")}
          className="w-full rounded-xl border border-border bg-card py-2 ps-9 pe-3 text-sm outline-none transition focus:border-emerald-500"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "المورد", "Supplier")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "الهاتف", "Phone")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "إجمالي المشتريات", "Total purchases")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "المدفوع", "Paid")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "المستحق", "Due")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "الحد الائتماني", "Credit limit")}</th>
                <th className="px-4 py-3 text-end font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    {L(lang, "لا يوجد موردون", "No suppliers")}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className={`transition hover:bg-muted/30 ${s.isActive ? "" : "opacity-50"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.type === "COMPANY" ? "bg-violet-500/10 text-violet-600" : "bg-sky-500/10 text-sky-600"}`}>
                          {s.type === "COMPANY" ? <Building2 className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold">{s.nameAr || s.nameEn || s.name || s.companyName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.companyName || (s.contactPerson ? L(lang, "مسؤول الاتصال", "Contact") + " " + s.contactPerson : s.type)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.phone || "—"}</td>
                    <td className="px-4 py-3 text-end text-muted-foreground">{formatMoney(s.totalPurchases, currency, lang)}</td>
                    <td className="px-4 py-3 text-end text-emerald-600">{formatMoney(s.totalPaid, currency, lang)}</td>
                    <td className="px-4 py-3 text-end">
                      <span className={`font-bold ${s.totalDue > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {formatMoney(s.totalDue, currency, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end text-muted-foreground">{formatMoney(s.creditLimit, currency, lang)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleActive(s)} title={L(lang, "تفعيل/إيقاف", "Toggle")} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-emerald-500/10 hover:text-emerald-600">
                          {s.isActive ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </button>
                        <button onClick={() => openEdit(s)} title={L(lang, "تعديل", "Edit")} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-sky-500/10 hover:text-sky-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(s)} title={L(lang, "حذف", "Delete")} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setShowForm(false)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Truck className="h-4 w-4 text-emerald-600" />
                {form.id ? L(lang, "تعديل المورد", "Edit supplier") : L(lang, "مورد جديد", "New supplier")}
              </h3>
              <button onClick={() => setShowForm(false)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={L(lang, "الاسم عربي", "Arabic name")} required>
                <input value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} className={inputCls} />
              </Field>
              <Field label={L(lang, "الاسم إنجليزي", "English name")}>
                <input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} className={inputCls} />
              </Field>
              <Field label={L(lang, "اسم الشركة", "Company name")}>
                <input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={inputCls} />
              </Field>
              <Field label={L(lang, "النوع", "Type")}>
                <select value={form.type} onChange={(e) => set("type", e.target.value as FormState["type"])} className={inputCls}>
                  <option value="COMPANY">{L(lang, "شركة", "Company")}</option>
                  <option value="INDIVIDUAL">{L(lang, "فرد", "Individual")}</option>
                </select>
              </Field>
              <Field label={L(lang, "الهاتف", "Phone")}>
                <div className="relative">
                  <Phone className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={`${inputCls} ps-9`} dir="ltr" />
                </div>
              </Field>
              <Field label={L(lang, "هاتف بديل", "Alt phone")}>
                <input value={form.phoneAlt} onChange={(e) => set("phoneAlt", e.target.value)} className={inputCls} dir="ltr" />
              </Field>
              <Field label={L(lang, "البريد", "Email")}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={form.email} onChange={(e) => set("email", e.target.value)} className={`${inputCls} ps-9`} dir="ltr" />
                </div>
              </Field>
              <Field label={L(lang, "مسؤول الاتصال", "Contact person")}>
                <input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} className={inputCls} />
              </Field>
              <Field label={L(lang, "الرقم الضريبي", "Tax number")}>
                <input value={form.taxNumber} onChange={(e) => set("taxNumber", e.target.value)} className={inputCls} dir="ltr" />
              </Field>
              <Field label={L(lang, "شروط الدفع", "Payment terms")}>
                <input value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} className={inputCls} placeholder={L(lang, "مثال: نقداً، 30 يوم", "e.g. cash, 30 days")} />
              </Field>
              <Field label={L(lang, "الحد الائتماني", "Credit limit")}>
                <MoneyInput value={form.creditLimit} onChange={(v) => set("creditLimit", v)} currency={currency} lang={lang} />
              </Field>
              <Field label={L(lang, "الرصيد الافتتاحي", "Opening balance")}>
                <MoneyInput value={form.openingBalance} onChange={(v) => set("openingBalance", v)} currency={currency} lang={lang} />
              </Field>
              <Field label={L(lang, "المحافظة", "Governorate")}>
                <input value={form.governorate} onChange={(e) => set("governorate", e.target.value)} className={inputCls} />
              </Field>
              <Field label={L(lang, "المديرية", "District")}>
                <input value={form.district} onChange={(e) => set("district", e.target.value)} className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={L(lang, "العنوان", "Address")}>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute start-2.5 top-3 h-4 w-4 text-muted-foreground" />
                    <input value={form.address} onChange={(e) => set("address", e.target.value)} className={`${inputCls} ps-9`} />
                  </div>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label={L(lang, "ملاحظات", "Notes")}>
                  <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inputCls} resize-none`} />
                </Field>
              </div>
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  currency,
  lang,
}: {
  value: string;
  onChange: (v: string) => void;
  currency: AppCurrency;
  lang: "ar" | "en";
}) {
  return (
    <div className="relative">
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} min={0} placeholder="0" />
      <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {lang === "ar" ? currency.symbolAr : currency.symbol}
      </span>
    </div>
  );
}