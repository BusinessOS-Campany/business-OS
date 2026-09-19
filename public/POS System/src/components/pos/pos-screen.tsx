"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  Clock,
  Landmark,
  Minus,
  Package,
  PauseCircle,
  PlayCircle,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingCart,
  Star,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";
import type { AppCurrency } from "@/lib/format";
import { formatMoney, formatQty } from "@/lib/format";
import { lineTotal } from "@/lib/money";

interface PosProduct {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  cost: number;
  barcode: string;
  sku: string;
  isFavorite: boolean;
  categoryId: string | null;
  minStock: number;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  type: string;
  unitName: string;
  stock: number;
}

interface PosCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface PosCustomer {
  id: string;
  name: string;
  phone: string;
  type: string;
}

interface PosMethod {
  id: string;
  name: string;
  type: string;
  requiresReference: boolean;
}

interface HeldSale {
  id: string;
  invoiceNo: string;
  total: number;
  createdAt: string;
  items: { productId: string; quantity: number; price: number }[];
}

interface CartLine {
  productId: string;
  name: string;
  price: number;
  cost: number;
  qty: number; // thousandths
  stock: number;
  weighted: boolean;
  trackInventory: boolean;
  allowNegativeStock: boolean;
}

interface ReceiptLine {
  productId: string;
  name: string;
  qty: number;
  total: number;
}

interface PosScreenProps {
  lang: "ar" | "en";
  currency: AppCurrency;
  companyName: string;
  branch: { id: string; name: string };
  categories: PosCategory[];
  products: PosProduct[];
  customers: PosCustomer[];
  paymentMethods: PosMethod[];
  heldSales: HeldSale[];
  permissions: { canOverridePrice: boolean; canDiscount: boolean; canHold: boolean };
}

function L(lang: "ar" | "en", ar: string, en: string): string {
  return lang === "ar" ? ar : en;
}

export function PosScreen({
  lang,
  currency,
  companyName,
  branch,
  categories,
  products,
  customers,
  paymentMethods,
  heldSales,
  permissions,
}: PosScreenProps) {
  const router = useRouter();
  const [viewProducts, setViewProducts] = useState<PosProduct[]>(products);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [onlyFav, setOnlyFav] = useState(false);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showPay, setShowPay] = useState(false);
  const [payState, setPayState] = useState<Record<string, string>>({});
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [showHeld, setShowHeld] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    id: string;
    invoiceNo: string;
    total: number;
    changeAmount: number;
    paidAmount: number;
    lines: ReceiptLine[];
    discount: number;
    subtotal: number;
  } | null>(null);
  const scannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setViewProducts(products);
  }, [products]);

  const pickName = (p: PosProduct) => (lang === "ar" ? p.nameAr || p.nameEn : p.nameEn || p.nameAr);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return viewProducts.filter((p) => {
      if (activeCategory !== "ALL" && p.categoryId !== activeCategory) return false;
      if (onlyFav && !p.isFavorite) return false;
      if (q) {
        const hay = `${p.nameAr} ${p.nameEn} ${p.sku} ${p.barcode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [viewProducts, activeCategory, onlyFav, search]);

  const cartQtyOf = (productId: string) => cart.find((l) => l.productId === productId)?.qty ?? 0;

  function addProduct(p: PosProduct) {
    if (busy) return;
    const existing = cart.find((l) => l.productId === p.id);
    const currentQty = existing?.qty ?? 0;
    const nextQty = currentQty + 1000;
    if (p.trackInventory && !p.allowNegativeStock && nextQty > p.stock) {
      if (currentQty >= p.stock) return;
    }
    setCart((prev) => {
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id
            ? { ...l, qty: Math.min(nextQty, l.trackInventory && !l.allowNegativeStock ? l.stock : nextQty) }
            : l
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: pickName(p),
          price: p.price,
          cost: p.cost,
          qty: 1000,
          stock: p.stock,
          weighted: p.type === "WEIGHTED" || p.type === "COMPOSITE",
          trackInventory: p.trackInventory,
          allowNegativeStock: p.allowNegativeStock,
        },
      ];
    });
  }

  function setLineQty(productId: string, qtyThousandths: number) {
    if (!Number.isFinite(qtyThousandths)) return;
    const q = Math.max(0, Math.round(qtyThousandths));
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          let clamped = q;
          if (l.weighted && clamped < 100 && clamped > 0) clamped = 100;
          if (l.trackInventory && !l.allowNegativeStock && clamped > l.stock) clamped = l.stock;
          return { ...l, qty: clamped };
        })
        .filter((l) => l.qty > 0)
    );
  }

  function setLinePrice(productId: string, price: number) {
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, price: Math.max(0, Math.round(price)) } : l))
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function scan() {
    const code = barcode.trim();
    if (!code) return;
    const p = viewProducts.find((x) => x.barcode === code || x.sku === code);
    if (p) {
      addProduct(p);
      setBarcode("");
    } else {
      setError(L(lang, "المنتج غير موجود", "Product not found"));
      setBarcode("");
      setTimeout(() => setError(""), 2500);
    }
  }

  const subTotal = useMemo(() => cart.reduce((s, l) => s + lineTotal(l.qty, l.price), 0), [cart]);
  const discount = useMemo(
    () => (discountPercent > 0 ? Math.round((subTotal * discountPercent) / 100) : 0),
    [subTotal, discountPercent]
  );
  const total = subTotal - discount;

  async function submit(status: "COMPLETED" | "HELD") {
    if (busy) return;
    setError("");
    if (cart.length === 0) return;

    const items = cart.map((l) => ({ productId: l.productId, quantity: l.qty, price: l.price }));
    let payments: { methodId: string; amount: number; reference: string }[] = [];
    let paidMinor = 0;
    if (status === "COMPLETED") {
      payments = paymentMethods
        .map((m) => {
          const raw = parseFloat(payState[m.id] ?? "");
          const amount = Number.isFinite(raw) ? Math.round(raw * 100) : 0;
          return { methodId: m.id, amount, reference: "" };
        })
        .filter((p) => p.amount > 0);
      paidMinor = payments.reduce((s, p) => s + p.amount, 0);
      if (paidMinor === 0 && !customer) {
        setError(L(lang, "أدخل مبلغ الدفع أو اختر عميلاً", "Enter a payment or select a customer"));
        return;
      }
    }

    setBusy(true);
    try {
      const res = await fetch("/pos/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branch.id,
          customerId: customer || null,
          status,
          heldSaleId: status === "COMPLETED" ? resumeId : null,
          discountPercent,
          notes: "",
          items,
          payments,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(statusError(json.error));
        return;
      }
      if (status === "COMPLETED") {
        setSuccess({
          id: json.data.id,
          invoiceNo: json.data.invoiceNo,
          total: json.data.total,
          changeAmount: json.data.changeAmount,
          paidAmount: paidMinor,
          discount,
          subtotal: subTotal,
          lines: cart.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty, total: lineTotal(l.qty, l.price) })),
        });
        setCart([]);
        setCustomer("");
        setDiscountPercent(0);
        setPayState({});
        setResumeId(null);
        setShowPay(false);
      } else {
        setCart([]);
        setShowHeld(false);
      }
      router.refresh();
    } catch {
      setError(L(lang, "حدث خطأ في الاتصال", "Network error"));
    } finally {
      setBusy(false);
    }
  }

  function statusError(err: string) {
    if (err?.startsWith("insufficient_stock")) return L(lang, "الكمية غير متوفرة في المخزون", "Insufficient stock");
    if (err?.startsWith("price_below_min")) return L(lang, "السعر أقل من الحد الأدنى", "Price below minimum");
    if (err?.startsWith("product_not_found")) return L(lang, "المنتج غير موجود", "Product not found");
    return L(lang, "تعذر حفظ البيع", "Could not save the sale");
  }

  function openPay() {
    setError("");
    if (cart.length === 0) {
      setError(L(lang, "السلة فارغة", "Cart is empty"));
      return;
    }
    if (discountPercent > 0 && !permissions.canDiscount) {
      setError(L(lang, "ليست لديك صلاحية الخصومات", "No discount permission"));
      return;
    }
    const initial: Record<string, string> = {};
    paymentMethods.forEach((m, i) => {
      initial[m.id] = i === 0 ? String(total / 100) : "";
    });
    setPayState(initial);
    setShowPay(true);
  }

  function resumeHeld(held: HeldSale) {
    const lines: CartLine[] = [];
    for (const it of held.items) {
      const p = viewProducts.find((x) => x.id === it.productId);
      if (!p) {
        setError(L(lang, "منتج السلة المعلقة غير متوفر", "A held item is no longer available"));
        return;
      }
      lines.push({
        productId: p.id,
        name: pickName(p),
        price: it.price || p.price,
        cost: p.cost,
        qty: it.quantity,
        stock: p.stock,
        weighted: p.type === "WEIGHTED" || p.type === "COMPOSITE",
        trackInventory: p.trackInventory,
        allowNegativeStock: p.allowNegativeStock,
      });
    }
    setCart(lines);
    setResumeId(held.id);
    setShowHeld(false);
  }

  const paidMinor = useMemo(() => {
    return paymentMethods.reduce((s, m) => {
      const raw = parseFloat(payState[m.id] ?? "");
      return s + (Number.isFinite(raw) ? raw * 100 : 0);
    }, 0);
  }, [payState, paymentMethods]);
  const change = Math.max(0, paidMinor - total);
  const due = Math.max(0, total - paidMinor);

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col gap-4 lg:h-[calc(100vh-5.5rem)] lg:flex-row">
      <input
        ref={scannerRef}
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") scan();
        }}
        onBlur={() => setTimeout(() => scannerRef.current?.focus(), 60)}
        className="sr-only"
        aria-label="barcode scanner"
        autoFocus
      />

      {error && (
        <div className="fixed inset-x-0 top-20 z-[60] mx-auto w-fit rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-white shadow-lg">
          {error}
        </div>
      )}

      {/* Products panel */}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={L(lang, "بحث بالاسم أو الرمز…", "Search by name or barcode…")}
              className="w-full rounded-xl border border-border bg-muted/40 py-2 ps-9 pe-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <button
            onClick={() => setOnlyFav((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              onlyFav
                ? "border-amber-400 bg-amber-500/10 text-amber-600"
                : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Star className={`h-4 w-4 ${onlyFav ? "fill-current" : ""}`} />
            <span className="hidden sm:inline">{L(lang, "المفضلة", "Favorites")}</span>
          </button>
          <button
            onClick={() => scannerRef.current?.focus()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/50"
          >
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">{L(lang, "مسح", "Scan")}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-3 py-2.5">
          <Chip active={activeCategory === "ALL"} onClick={() => setActiveCategory("ALL")} label={L(lang, "الكل", "All")} color="#10b981" />
          {categories.map((c) => (
            <Chip key={c.id} active={activeCategory === c.id} onClick={() => setActiveCategory(c.id)} label={c.name} color={c.color} />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">{L(lang, "لا توجد منتجات", "No products found")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filtered.map((p) => {
                const out = p.trackInventory && !p.allowNegativeStock && p.stock - cartQtyOf(p.id) <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    disabled={out || busy}
                    className={`group relative flex min-h-28 flex-col justify-between rounded-xl border p-3 text-start transition ${
                      out
                        ? "cursor-not-allowed border-border opacity-45"
                        : "border-border bg-background hover:border-emerald-500/60 hover:shadow-md active:scale-[0.98]"
                    }`}
                  >
                    {p.isFavorite && <Star className="absolute end-2 top-2 h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    <div className="min-w-0">
                      <span className="mb-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#10b981" }} />
                      <p className="line-clamp-2 text-sm font-bold leading-snug">{pickName(p)}</p>
                      {p.unitName && <p className="mt-0.5 text-[10px] text-muted-foreground">{p.unitName}</p>}
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(p.price, currency, lang)}
                      </span>
                      {p.trackInventory && !p.allowNegativeStock && (
                        <span className={`text-[10px] ${out ? "text-destructive" : "text-muted-foreground"}`}>
                          {out ? L(lang, "نفد", "Out") : formatQty(p.stock - cartQtyOf(p.id), lang, 0)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="flex min-h-0 w-full flex-col rounded-2xl border border-border bg-card lg:w-[380px] xl:w-[400px]">
        <div className="flex items-center justify-between gap-2 border-b border-border p-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold">{L(lang, "الفاتورة", "Invoice")}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{cart.length}</span>
          </div>
          {permissions.canHold && (
            <button
              onClick={() => setShowHeld((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted/50"
            >
              <PauseCircle className="h-3.5 w-3.5" />
              {L(lang, "المعلقة", "Held")}
              {heldSales.length > 0 && (
                <span className="rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-bold text-emerald-600">
                  {heldSales.length}
                </span>
              )}
            </button>
          )}
        </div>

        {showHeld && (
          <div className="max-h-44 overflow-y-auto border-b border-border bg-muted/20 p-2">
            {heldSales.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                {L(lang, "لا توجد فواتير معلقة", "No held invoices")}
              </p>
            ) : (
              heldSales.map((h) => (
                <button
                  key={h.id}
                  onClick={() => resumeHeld(h)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-start text-sm transition hover:bg-muted/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{h.invoiceNo}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {new Date(h.createdAt).toLocaleTimeString(lang === "ar" ? "ar" : "en", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold">{formatMoney(h.total, currency, lang)}</span>
                    <PlayCircle className="h-4 w-4 text-emerald-600" />
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        <div className="border-b border-border p-3">
          <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <User className="h-3 w-3" />
            {L(lang, "العميل", "Customer")}
          </label>
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none transition focus:border-emerald-500"
          >
            <option value="">{L(lang, "عميل نقدي (بدون اسم)", "Cash customer")}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <Package className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{L(lang, "السلة فارغة - اختر منتجات", "Cart is empty - pick products")}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {cart.map((l) => (
                <li key={l.productId} className="rounded-xl border border-border bg-background p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-semibold leading-tight">{l.name}</p>
                    <button
                      onClick={() => removeLine(l.productId)}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {permissions.canOverridePrice ? (
                      <input
                        type="number"
                        value={l.price / 100}
                        onChange={(e) => setLinePrice(l.productId, Math.round((Number(e.target.value) || 0) * 100))}
                        className="w-20 rounded-md border border-border bg-background px-1.5 py-1 text-xs outline-none focus:border-emerald-500"
                      />
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">{formatMoney(l.price, currency, lang)}</span>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setLineQty(l.productId, l.qty - 1000)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted/60"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        value={l.qty / 1000}
                        step={l.weighted ? 0.1 : 1}
                        min={0}
                        onChange={(e) => setLineQty(l.productId, (Number(e.target.value) || 0) * 1000)}
                        className="w-14 rounded-md border border-border bg-background px-1 py-1 text-center text-sm font-semibold outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => setLineQty(l.productId, l.qty + 1000)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted/60"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="w-20 text-end text-sm font-bold">{formatMoney(lineTotal(l.qty, l.price), currency, lang)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{L(lang, "المجموع", "Subtotal")}</span>
              <span className="font-medium">{formatMoney(subTotal, currency, lang)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{L(lang, "الخصم", "Discount")}</span>
              <div className="flex items-center gap-1">
                {permissions.canDiscount ? (
                  <>
                    <input
                      type="number"
                      value={discountPercent}
                      min={0}
                      max={100}
                      onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-14 rounded-md border border-border bg-background px-1.5 py-0.5 text-end text-xs font-semibold outline-none focus:border-emerald-500"
                      disabled={busy}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </>
                ) : (
                  <span className="font-medium">0%</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 text-base">
              <span className="font-bold">{L(lang, "الإجمالي", "Total")}</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatMoney(total, currency, lang)}</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {permissions.canHold && (
              <button
                onClick={() => submit("HELD")}
                disabled={busy || cart.length === 0}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-semibold transition hover:bg-muted/50 disabled:opacity-40"
              >
                <PauseCircle className="h-4 w-4" />
                {L(lang, "تعليق", "Hold")}
              </button>
            )}
            <button
              onClick={openPay}
              disabled={busy || cart.length === 0}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-40 ${
                permissions.canHold ? "" : "col-span-2"
              } bg-emerald-600 hover:bg-emerald-700`}
            >
              <Receipt className="h-4 w-4" />
              {L(lang, "الدفع", "Pay")}
            </button>
          </div>
        </div>
      </div>

      {/* Payment modal */}
      {showPay && (
        <Modal onClose={() => setShowPay(false)}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold">{L(lang, "الدفع", "Payment")}</h3>
            <span className="text-sm text-muted-foreground">{branch.name}</span>
          </div>

          <div className="mb-4 rounded-xl bg-emerald-500/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">{L(lang, "الإجمالي المستحق", "Amount due")}</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatMoney(total, currency, lang)}</p>
          </div>

          <div className="space-y-2">
            {paymentMethods.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-xl border border-border bg-background p-2">
                <MethodIcon type={m.type} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</span>
                <input
                  type="number"
                  value={payState[m.id] ?? ""}
                  min={0}
                  placeholder="0"
                  onChange={(e) => setPayState((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  disabled={busy}
                  className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-end text-sm font-semibold outline-none focus:border-emerald-500"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{L(lang, "المدفوع", "Paid")}</span>
              <span className="font-medium">{formatMoney(Math.round(paidMinor), currency, lang)}</span>
            </div>
            {due > 0 ? (
              <div className="flex justify-between font-medium text-amber-600">
                <span>{L(lang, "المتبقي (آجل)", "Remaining (credit)")}</span>
                <span>{formatMoney(due, currency, lang)}</span>
              </div>
            ) : (
              <div className="flex justify-between font-medium text-emerald-600">
                <span>{L(lang, "الباقي", "Change")}</span>
                <span>{formatMoney(change, currency, lang)}</span>
              </div>
            )}
          </div>

          {customer && due > 0 && (
            <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600">
              {L(lang, "سيتم إضافتها إلى رصيد العميل", "Will be added to the customer balance")}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowPay(false)}
              disabled={busy}
              className="rounded-xl border border-border py-2.5 text-sm font-semibold transition hover:bg-muted/50"
            >
              {L(lang, "إلغاء", "Cancel")}
            </button>
            <button
              onClick={() => submit("COMPLETED")}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
            >
              {busy ? L(lang, "جارٍ الحفظ…", "Saving…") : L(lang, "إتمام البيع", "Complete sale")}
            </button>
          </div>
        </Modal>
      )}

      {/* Success overlay */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircleIcon />
            </div>
            <h3 className="mt-3 text-lg font-extrabold">{L(lang, "تم البيع بنجاح", "Sale completed")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {L(lang, "رقم الفاتورة", "Invoice no")}: <span className="font-bold text-foreground">{success.invoiceNo}</span>
            </p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatMoney(success.total, currency, lang)}</p>
            {success.changeAmount > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {L(lang, "الباقي", "Change")}: <span className="font-bold">{formatMoney(success.changeAmount, currency, lang)}</span>
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-semibold transition hover:bg-muted/50"
              >
                <Printer className="h-4 w-4" />
                {L(lang, "طباعة", "Print")}
              </button>
              <button
                onClick={() => setSuccess(null)}
                className="rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                {L(lang, "بيع جديد", "New sale")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print receipt */}
      {success && (
        <div className="print-area hidden">
          <div className="p-4 text-sm">
            <h1 className="text-center text-lg font-extrabold">{companyName}</h1>
            <p className="text-center">{branch.name}</p>
            <p className="mt-2 flex justify-between">
              <span>{L(lang, "الفاتورة", "Invoice")}:</span>
              <span className="font-bold">{success.invoiceNo}</span>
            </p>
            <p className="flex justify-between">
              <span>{L(lang, "التاريخ", "Date")}:</span>
              <span>{new Date().toLocaleString(lang === "ar" ? "ar" : "en")}</span>
            </p>
            <div className="mt-3 border-t border-dashed pt-2">
              {success.lines.map((l) => (
                <p key={l.productId} className="flex justify-between">
                  <span>
                    {l.name} × {formatQty(l.qty, lang)}
                  </span>
                  <span>{formatMoney(l.total, currency, lang)}</span>
                </p>
              ))}
            </div>
            <div className="mt-3 border-t border-dashed pt-2">
              <p className="flex justify-between">
                <span>{L(lang, "المجموع", "Subtotal")}</span>
                <span>{formatMoney(success.subtotal, currency, lang)}</span>
              </p>
              {success.discount > 0 && (
                <p className="flex justify-between">
                  <span>{L(lang, "الخصم", "Discount")}</span>
                  <span>-{formatMoney(success.discount, currency, lang)}</span>
                </p>
              )}
              <p className="flex justify-between text-base font-extrabold">
                <span>{L(lang, "الإجمالي", "Total")}</span>
                <span>{formatMoney(success.total, currency, lang)}</span>
              </p>
              <p className="flex justify-between">
                <span>{L(lang, "المدفوع", "Paid")}</span>
                <span>{formatMoney(success.paidAmount, currency, lang)}</span>
              </p>
              {success.changeAmount > 0 && (
                <p className="flex justify-between">
                  <span>{L(lang, "الباقي", "Change")}</span>
                  <span>{formatMoney(success.changeAmount, currency, lang)}</span>
                </p>
              )}
            </div>
            <p className="mt-4 text-center text-xs">{L(lang, "شكراً لتعاملكم معنا", "Thank you for your business")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      className="h-8 w-8 text-emerald-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function Chip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "border-border text-muted-foreground hover:bg-muted/50"
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </button>
  );
}

function MethodIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0";
  switch (type) {
    case "CASH":
      return <Banknote className={`${cls} text-emerald-600`} />;
    case "CARD":
      return <CreditCard className={`${cls} text-sky-600`} />;
    case "WALLET":
      return <Wallet className={`${cls} text-violet-600`} />;
    case "TRANSFER":
      return <Landmark className={`${cls} text-amber-600`} />;
    case "CREDIT":
      return <Clock className={`${cls} text-rose-600`} />;
    default:
      return <Banknote className={`${cls} text-muted-foreground`} />;
  }
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}