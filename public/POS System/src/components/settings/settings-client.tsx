"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Building2, Warehouse, Users, Package, Save } from "lucide-react";

interface CompanyData {
  name: string; nameAr: string; nameEn: string; businessType: string;
  regNumber: string; taxNumber: string; phone: string; phoneAlt: string;
  email: string; address: string; governorate: string; district: string;
  invoicePrefix: string;
}

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

export function SettingsClient({
  lang,
  company,
  counts,
}: {
  lang: "ar" | "en";
  company: CompanyData;
  counts: { branches: number; warehouses: number; users: number; products: number };
}) {
  const router = useRouter();
  const [form, setForm] = useState<CompanyData>(company);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof CompanyData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/pos/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      setMsg(json.success ? { ok: true, text: L(lang, "تم الحفظ", "Saved") } : { ok: false, text: L(lang, "تعذر الحفظ", "Could not save") });
      if (json.success) router.refresh();
    } catch {
      setMsg({ ok: false, text: L(lang, "حدث خطأ في الاتصال", "Network error") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Settings className="h-5 w-5 text-emerald-600" />
            {L(lang, "إعدادات الشركة", "Company settings")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "الملف الشخصي للشركة", "Company profile")}</p>
        </div>
        <button onClick={save} disabled={busy} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
          <Save className="h-4 w-4" />
          {busy ? L(lang, "جارٍ الحفظ…", "Saving…") : L(lang, "حفظ", "Save")}
        </button>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-2 text-sm font-medium ${msg.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Building2 className="h-4 w-4" />} label={L(lang, "الفروع", "Branches")} value={counts.branches} />
        <Stat icon={<Warehouse className="h-4 w-4" />} label={L(lang, "المخازن", "Warehouses")} value={counts.warehouses} />
        <Stat icon={<Users className="h-4 w-4" />} label={L(lang, "المستخدمون", "Users")} value={counts.users} />
        <Stat icon={<Package className="h-4 w-4" />} label={L(lang, "المنتجات", "Products")} value={counts.products} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-bold">{L(lang, "المعلومات الأساسية", "Basic information")}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={L(lang, "الاسم (عربي)", "Name (AR)")}><input value={form.nameAr} onChange={set("nameAr")} className={inputCls} /></Field>
            <Field label={L(lang, "الاسم (إنجليزي)", "Name (EN)")}><input value={form.nameEn || form.name} onChange={set("nameEn")} className={inputCls} /></Field>
            <Field label={L(lang, "اسم العرض", "Display name")}><input value={form.name} onChange={set("name")} className={inputCls} /></Field>
            <Field label={L(lang, "نوع النشاط", "Business type")}><input value={form.businessType} onChange={set("businessType")} className={inputCls} /></Field>
            <Field label={L(lang, "السجل التجاري", "Reg. number")}><input value={form.regNumber} onChange={set("regNumber")} className={inputCls} /></Field>
            <Field label={L(lang, "الرقم الضريبي", "Tax number")}><input value={form.taxNumber} onChange={set("taxNumber")} className={inputCls} /></Field>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-bold">{L(lang, "التواصل والعنوان", "Contact & address")}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={L(lang, "الهاتف", "Phone")}><input value={form.phone} onChange={set("phone")} className={inputCls} /></Field>
            <Field label={L(lang, "هاتف آخر", "Alt phone")}><input value={form.phoneAlt} onChange={set("phoneAlt")} className={inputCls} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={set("email")} className={inputCls} /></Field>
            <Field label={L(lang, "المحافظة", "Governorate")}><input value={form.governorate} onChange={set("governorate")} className={inputCls} /></Field>
            <Field label={L(lang, "المديرية", "District")}><input value={form.district} onChange={set("district")} className={inputCls} /></Field>
            <Field label={L(lang, "العنوان", "Address")}><input value={form.address} onChange={set("address")} className={inputCls} /></Field>
            <Field label={L(lang, "بادئة الفاتورة", "Invoice prefix")}><input value={form.invoicePrefix} onChange={set("invoicePrefix")} className={inputCls} /></Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">{icon}</span>
      <div>
        <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
        <p className="text-base font-extrabold">{value}</p>
      </div>
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