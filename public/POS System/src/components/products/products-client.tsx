"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Boxes,
  X,
  Check,
} from "lucide-react";
import type { AppCurrency } from "@/lib/format";
import { formatMoney, formatQty } from "@/lib/format";

interface ProductRow {
  id: string;
  sku: string;
  barcode: string;
  nameAr: string;
  nameEn: string;
  price: number;
  cost: number;
  wholesalePrice: number;
  minPrice: number;
  minStock: number;
  isActive: boolean;
  isFavorite: boolean;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  type: string;
  categoryId: string | null;
  categoryName: string;
  unitName: string;
  stock: number;
}

interface ProductsClientProps {
  lang: "ar" | "en";
  currency: AppCurrency;
  canManage: boolean;
  categories: { id: string; name: string }[];
  units: { id: string; name: string }[];
  products: ProductRow[];
}

interface FormState {
  id: string | null;
  nameAr: string;
  nameEn: string;
  sku: string;
  barcode: string;
  categoryId: string;
  unitId: string;
  type: string;
  cost: string;
  price: string;
  wholesalePrice: string;
  minPrice: string;
  minStock: string;
  openingStock: string;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  isFavorite: boolean;
}

const emptyForm: FormState = {
  id: null,
  nameAr: "",
  nameEn: "",
  sku: "",
  barcode: "",
  categoryId: "",
  unitId: "",
  type: "NORMAL",
  cost: "",
  price: "",
  wholesalePrice: "",
  minPrice: "",
  minStock: "0",
  openingStock: "",
  trackInventory: true,
  allowNegativeStock: false,
  isFavorite: false,
};

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}
const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (v: string) => Math.round(num(v) * 100);
const qty = (v: string) => Math.round(num(v) * 1000);

export function ProductsClient({ lang, currency, canManage, categories, units, products }: ProductsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (status === "ACTIVE" && !p.isActive) return false;
      if (status === "INACTIVE" && p.isActive) return false;
      if (q) {
        const hay = `${p.nameAr} ${p.nameEn} ${p.sku} ${p.barcode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, search, categoryId, status]);

  function openNew() {
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(p: ProductRow) {
    setForm({
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      sku: p.sku,
      barcode: p.barcode,
      categoryId: p.categoryId ?? "",
      unitId: units.find((u) => u.name === p.unitName)?.id ?? "",
      type: p.type,
      cost: String(p.cost / 100),
      price: String(p.price / 100),
      wholesalePrice: String(p.wholesalePrice / 100),
      minPrice: String(p.minPrice / 100),
      minStock: String(p.minStock / 1000),
      openingStock: "",
      trackInventory: p.trackInventory,
      allowNegativeStock: p.allowNegativeStock,
      isFavorite: p.isFavorite,
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
    if (!form.nameAr.trim() && !form.nameEn.trim()) {
      setError(L(lang, "أدخل اسم المنتج", "Enter a product name"));
      return;
    }
    if (!form.price) {
      setError(L(lang, "أدخل سعر البيع", "Enter a selling price"));
      return;
    }
    setBusy(true);
    try {
      const payload = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim(),
        categoryId: form.categoryId || null,
        unitId: form.unitId || null,
        type: form.type,
        cost: money(form.cost),
        price: money(form.price),
        wholesalePrice: money(form.wholesalePrice),
        minPrice: money(form.minPrice),
        minStock: qty(form.minStock),
        openingStock: form.id ? 0 : qty(form.openingStock),
        trackInventory: form.trackInventory,
        allowNegativeStock: form.allowNegativeStock,
        isFavorite: form.isFavorite,
        isActive: true,
      };
      const res = await fetch(form.id ? `/pos/api/products/${form.id}` : "/pos/api/products", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(apiError(json.error));
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

  async function toggleActive(p: ProductRow) {
    try {
      await fetch(`/pos/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      router.refresh();
    } catch {
      /* ignore */
    }
  }

  async function toggleFav(p: ProductRow) {
    try {
      await fetch(`/pos/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !p.isFavorite }),
      });
      router.refresh();
    } catch {
      /* ignore */
    }
  }

  async function remove(p: ProductRow) {
    if (!window.confirm(L(lang, `حذف المنتج "${p.nameAr || p.nameEn}"؟`, `Delete product "${p.nameEn || p.nameAr}"?`))) return;
    const res = await fetch(`/pos/api/products/${p.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      setError(apiError(json.error));
      setTimeout(() => setError(""), 3000);
      return;
    }
    router.refresh();
  }

  function apiError(err: string) {
    if (err === "sku_exists") return L(lang, "الرمز موجود مسبقاً", "SKU already exists");
    if (err === "barcode_exists") return L(lang, "الباركود موجود مسبقاً", "Barcode already exists");
    if (err === "in_use") return L(lang, "لا يمكن حذف منتج عليه حركات - يمكنك إلغاء تفعيله", "Cannot delete a product with transactions - deactivate it instead");
    return err;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Package className="h-5 w-5 text-emerald-600" />
            {L(lang, "المنتجات", "Products")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {L(lang, "إدارة المنتجات والأسعار والمخزون", "Manage products, prices and stock")}
          </p>
        </div>
        {canManage && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            {L(lang, "منتج جديد", "New product")}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L(lang, "بحث بالاسم أو الرمز…", "Search by name or SKU…")}
            className="w-full rounded-xl border border-border bg-card py-2 ps-9 pe-3 text-sm outline-none transition focus:border-emerald-500"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">{L(lang, "كل الأقسام", "All categories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          <option value="ALL">{L(lang, "كل الحالات", "All statuses")}</option>
          <option value="ACTIVE">{L(lang, "نشط", "Active")}</option>
          <option value="INACTIVE">{L(lang, "موقوف", "Inactive")}</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "المنتج", "Product")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "الرمز", "SKU")}</th>
                <th className="px-4 py-3 text-start font-semibold">{L(lang, "القسم", "Category")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "التكلفة", "Cost")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "السعر", "Price")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "المخزون", "Stock")}</th>
                <th className="px-4 py-3 text-end font-semibold">{L(lang, "الحالة", "Status")}</th>
                <th className="px-4 py-3 text-end font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {L(lang, "لا توجد منتجات", "No products")}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.isFavorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                        <div className="min-w-0">
                          <p className="font-semibold">{p.nameAr || p.nameEn}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.nameEn || p.nameAr}{p.type !== "NORMAL" ? ` · ${p.type}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="font-mono text-xs">{p.sku || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.categoryName || "—"}</td>
                    <td className="px-4 py-3 text-end text-muted-foreground">{formatMoney(p.cost, currency, lang)}</td>
                    <td className="px-4 py-3 text-end font-semibold">{formatMoney(p.price, currency, lang)}</td>
                    <td className="px-4 py-3 text-end">
                      {p.trackInventory ? (
                        <span className={p.stock <= p.minStock ? "font-semibold text-amber-600" : "font-semibold text-emerald-600"}>
                          {formatQty(p.stock, lang, 0)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                        {p.isActive ? L(lang, "نشط", "Active") : L(lang, "موقوف", "Inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleFav(p)} title={L(lang, "مفضلة", "Favorite")} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-amber-500/10 hover:text-amber-600">
                            <Star className={`h-4 w-4 ${p.isFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
                          </button>
                          <button onClick={() => toggleActive(p)} title={L(lang, "تفعيل/إيقاف", "Toggle")} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-emerald-500/10 hover:text-emerald-600">
                            {p.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button onClick={() => openEdit(p)} title={L(lang, "تعديل", "Edit")} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-sky-500/10 hover:text-sky-600">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(p)} title={L(lang, "حذف", "Delete")} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
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
              <h3 className="text-base font-bold">
                {form.id ? L(lang, "تعديل المنتج", "Edit product") : L(lang, "منتج جديد", "New product")}
              </h3>
              <button onClick={() => setShowForm(false)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={L(lang, "الاسم عربي", "Arabic name")} required>
                <input value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} className={inputCls} placeholder={L(lang, "اسم المنتج بالعربية", "Product name (Arabic)")} />
              </Field>
              <Field label={L(lang, "الاسم إنجليزي", "English name")}>
                <input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} className={inputCls} placeholder="Product name (EN)" />
              </Field>
              <Field label={L(lang, "الرمز", "SKU")}>
                <input value={form.sku} onChange={(e) => set("sku", e.target.value)} className={inputCls} placeholder="SKU-1001" />
              </Field>
              <Field label={L(lang, "الباركود", "Barcode")}>
                <input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} className={inputCls} placeholder="629…" />
              </Field>
              <Field label={L(lang, "القسم", "Category")}>
                <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={L(lang, "الوحدة", "Unit")}>
                <select value={form.unitId} onChange={(e) => set("unitId", e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={L(lang, "النوع", "Type")}>
                <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputCls}>
                  {(["NORMAL", "WEIGHTED", "SERVICE", "BUNDLE", "COMPOSITE"] as const).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label={L(lang, "التكلفة", "Cost")}>
                <MoneyInput value={form.cost} onChange={(v) => set("cost", v)} currency={currency} lang={lang} />
              </Field>
              <Field label={L(lang, "سعر البيع", "Selling price")} required>
                <MoneyInput value={form.price} onChange={(v) => set("price", v)} currency={currency} lang={lang} />
              </Field>
              <Field label={L(lang, "سعر الجملة", "Wholesale price")}>
                <MoneyInput value={form.wholesalePrice} onChange={(v) => set("wholesalePrice", v)} currency={currency} lang={lang} />
              </Field>
              <Field label={L(lang, "الحد الأدنى للسعر", "Min price")}>
                <MoneyInput value={form.minPrice} onChange={(v) => set("minPrice", v)} currency={currency} lang={lang} />
              </Field>
              <Field label={L(lang, "حد إعادة الطلب", "Reorder level")}>
                <input type="number" value={form.minStock} onChange={(e) => set("minStock", e.target.value)} className={inputCls} min={0} step="0.001" />
              </Field>
              {!form.id && (
                <Field label={L(lang, "المخزون الافتتاحي", "Opening stock")}>
                  <input type="number" value={form.openingStock} onChange={(e) => set("openingStock", e.target.value)} className={inputCls} min={0} step="0.001" />
                </Field>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-4">
              <Toggle label={L(lang, "تتبع المخزون", "Track inventory")} checked={form.trackInventory} onChange={(v) => set("trackInventory", v)} />
              <Toggle label={L(lang, "سماح بمخزون سالب", "Allow negative stock")} checked={form.allowNegativeStock} onChange={(v) => set("allowNegativeStock", v)} disabled={!form.trackInventory} />
              <Toggle label={L(lang, "مفضل", "Favorite")} checked={form.isFavorite} onChange={(v) => set("isFavorite", v)} />
            </div>

            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} disabled={busy} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted/50">
                {L(lang, "إلغاء", "Cancel")}
              </button>
              <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40">
                {busy ? L(lang, "جارٍ الحفظ…", "Saving…") : L(lang, "حفظ", "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

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

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 text-sm ${disabled ? "opacity-40" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
      <span className="flex items-center gap-1.5"><Boxes className="h-3.5 w-3.5 text-muted-foreground" />{label}</span>
    </label>
  );
}