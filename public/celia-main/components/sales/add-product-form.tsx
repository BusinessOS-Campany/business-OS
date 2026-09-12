"use client";

import { useMemo, useState } from "react";
import { Banknote, CheckCircle2, Package, ShoppingBag, Tag, X, XCircle } from "lucide-react";
import { createProductSaleSchema } from "@/lib/sales/product-sale";
import type { ProductOption } from "@/lib/sales/products";
import type { ProductSaleRow } from "@/lib/products/queries";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface FieldErrors {
  productId?: string;
  unitPrice?: string;
  total?: string;
}

const headerGradient = `linear-gradient(135deg, color-mix(in srgb, var(--primary) 60%, white), var(--primary) 50%, color-mix(in srgb, var(--primary) 75%, black))`;

const selectClassName =
  "flex h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 appearance-none";

interface AddProductFormProps {
  products: ProductOption[];
  sale?: ProductSaleRow | null;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function AddProductForm({ products, sale, onSuccess, onClose }: AddProductFormProps) {
  const { locale, t } = useLocale();
  const isEdit = !!sale;
  const initialProduct = products[0];
  const saleProduct = sale ? products.find((p) => p.id === sale.productId) : undefined;
  const [productId, setProductId] = useState(sale?.productId ?? initialProduct?.id ?? "");
  const [model, setModel] = useState(
    saleProduct?.category ?? initialProduct?.category ?? "",
  );
  const [unitPrice, setUnitPrice] = useState(
    sale
      ? String(sale.unitPrice)
      : initialProduct && initialProduct.price > 0
        ? String(initialProduct.price)
        : "",
  );
  const [total, setTotal] = useState(
    sale
      ? String(sale.finalPrice)
      : initialProduct && initialProduct.price > 0
        ? String(initialProduct.price)
        : "",
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => createProductSaleSchema(t), [t]);

  const groups = useMemo(() => {
    const map = new Map<string, ProductOption[]>();
    for (const product of products) {
      const list = map.get(product.category) ?? [];
      list.push(product);
      map.set(product.category, list);
    }
    return Array.from(map.entries());
  }, [products]);

  function handleProductChange(id: string) {
    setProductId(id);
    setErrors((prev) => ({ ...prev, productId: undefined }));
    const product = products.find((p) => p.id === id);
    if (product) {
      setModel(product.category);
      const price = product.price > 0 ? String(product.price) : "";
      setUnitPrice(price);
      setTotal(price);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const result = schema.safeParse({ productId, unitPrice, total });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        productId: fieldErrors.productId?.[0],
        unitPrice: fieldErrors.unitPrice?.[0],
        total: fieldErrors.total?.[0],
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(sale ? `/api/sales/${sale.id}` : "/api/sales", {
        method: sale ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify(result.data),
      });
      const data = (await res.json()) as { message?: string; error?: string };

      if (res.ok) {
        setMessage({
          type: "success",
          text:
            data.message ?? (isEdit ? t.addProduct.updatedMessage : t.addProduct.successMessage),
        });
        setProductId("");
        setModel("");
        setUnitPrice("");
        setTotal("");
        onSuccess?.();
      } else {
        setMessage({ type: "error", text: data.error ?? t.addProduct.invalidData });
      }
    } catch {
      setMessage({ type: "error", text: t.addProduct.serverError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div
        className="flex items-center gap-3 px-5 py-5 text-white sm:px-6"
        style={{ backgroundImage: headerGradient }}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner">
          <ShoppingBag className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-extrabold">
            {isEdit ? t.addProduct.editTitle : t.addProduct.title}
          </h2>
          <p className="text-xs font-medium text-white/80">
            {isEdit ? t.addProduct.editSubtitle : t.addProduct.subtitle}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ms-auto rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
            aria-label={t.addProduct.cancel}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col space-y-5 p-5 sm:p-6">
        {message && (
          <div
            role="alert"
            className={cn(
              "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium",
              message.type === "success"
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t.addProduct.selectProduct} htmlFor="product" error={errors.productId}>
            <div className="relative">
              <Package
                className="pointer-events-none absolute inset-y-0 start-3 z-10 my-auto size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <select
                id="product"
                name="product"
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                disabled={loading}
                className={cn(
                  selectClassName,
                  "ps-10",
                  errors.productId && "border-destructive focus-visible:border-destructive",
                )}
              >
                <option value="" disabled>
                  {products.length === 0 ? t.addProduct.noProducts : t.addProduct.selectProduct}
                </option>
                {groups.map(([category, list]) => (
                  <optgroup key={category} label={category}>
                    {list.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {products.length === 0 && (
              <p className="text-xs font-medium text-muted-foreground">{t.addProduct.noProducts}</p>
            )}
          </FormField>

          <FormField label={t.addProduct.modelLabel} htmlFor="model">
            <Input
              id="model"
              name="model"
              type="text"
              placeholder={t.addProduct.modelPlaceholder}
              value={model}
              readOnly
              startIcon={<Tag className="size-4" aria-hidden="true" />}
              disabled={loading}
            />
          </FormField>

          <FormField label={t.addProduct.salePriceLabel} htmlFor="unitPrice" error={errors.unitPrice}>
            <Input
              id="unitPrice"
              name="unitPrice"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder={t.addProduct.salePricePlaceholder}
              value={unitPrice}
              readOnly
              startIcon={<Banknote className="size-4" aria-hidden="true" />}
              hasError={!!errors.unitPrice}
              disabled={loading}
            />
          </FormField>

          <FormField label={t.addProduct.finalPriceLabel} htmlFor="total" error={errors.total}>
            <Input
              id="total"
              name="total"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder={t.addProduct.finalPricePlaceholder}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              startIcon={<Banknote className="size-4" aria-hidden="true" />}
              hasError={!!errors.total}
              disabled={loading}
            />
          </FormField>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-border pt-5">
          <p className="hidden text-xs text-muted-foreground sm:block">{t.hobani.saveHint}</p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onClose}
              disabled={loading}
            >
              <X className="size-4" aria-hidden="true" />
              {t.addProduct.cancel}
            </Button>
            <Button
              type="submit"
              variant="success"
              size="lg"
              className="w-full sm:w-auto"
              loading={loading}
            >
              <Banknote className="size-4" aria-hidden="true" />
              {loading ? t.addProduct.saving : isEdit ? t.addProduct.saveChanges : t.addProduct.save}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
