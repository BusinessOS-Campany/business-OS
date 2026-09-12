"use client";

import { useMemo, useState } from "react";
import { Banknote, CheckCircle2, Package, Pencil, Tag, X, XCircle } from "lucide-react";
import { createProductSchema } from "@/lib/products/product";
import type { ProductRow } from "@/lib/products/queries";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface FieldErrors {
  name?: string;
  category?: string;
  price?: string;
}

const headerGradient = `linear-gradient(135deg, color-mix(in srgb, var(--primary) 60%, white), var(--primary) 50%, color-mix(in srgb, var(--primary) 75%, black))`;

interface ProductPriceFormProps {
  initialData?: ProductRow | null;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function ProductPriceForm({ initialData, onSuccess, onClose }: ProductPriceFormProps) {
  const { locale, t } = useLocale();
  const p = t.addProductPrice;
  const isEdit = !!initialData;
  const [name, setName] = useState(initialData?.name ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [price, setPrice] = useState(initialData?.price != null ? String(initialData.price) : "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => createProductSchema(t), [t]);

  function reset() {
    setName(initialData?.name ?? "");
    setCategory(initialData?.category ?? "");
    setPrice(initialData?.price != null ? String(initialData.price) : "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const result = schema.safeParse({ name, category, price });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        category: fieldErrors.category?.[0],
        price: fieldErrors.price?.[0],
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(initialData ? `/api/products/${initialData.id}` : "/api/products", {
        method: initialData ? "PUT" : "POST",
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
          text: data.message ?? (isEdit ? p.updatedMessage : p.successMessage),
        });
        reset();
        onSuccess?.();
      } else {
        setMessage({ type: "error", text: data.error ?? p.invalidData });
      }
    } catch {
      setMessage({ type: "error", text: p.serverError });
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
          {isEdit ? (
            <Pencil className="size-6" aria-hidden="true" />
          ) : (
            <Package className="size-6" aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 className="text-base font-extrabold">{isEdit ? p.editTitle : p.title}</h2>
          <p className="text-xs font-medium text-white/80">{isEdit ? p.editSubtitle : p.subtitle}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ms-auto rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
            aria-label={p.cancel}
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

        <FormField label={p.nameLabel} htmlFor="name" error={errors.name}>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder={p.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            startIcon={<Tag className="size-4" aria-hidden="true" />}
            hasError={!!errors.name}
            disabled={loading}
          />
        </FormField>

        <FormField label={p.categoryLabel} htmlFor="category" error={errors.category}>
          <Input
            id="category"
            name="category"
            type="text"
            placeholder={p.categoryPlaceholder}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            startIcon={<Package className="size-4" aria-hidden="true" />}
            hasError={!!errors.category}
            disabled={loading}
          />
        </FormField>

        <FormField label={p.priceLabel} htmlFor="price" error={errors.price}>
          <Input
            id="price"
            name="price"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder={p.pricePlaceholder}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            startIcon={<Banknote className="size-4" aria-hidden="true" />}
            hasError={!!errors.price}
            disabled={loading}
          />
        </FormField>

        <div className="mt-auto flex items-center justify-end gap-3 border-t border-border pt-5">
          <Button type="button" variant="outline" size="lg" onClick={onClose ?? reset} disabled={loading}>
            <X className="size-4" aria-hidden="true" />
            {p.cancel}
          </Button>
          <Button type="submit" variant="success" size="lg" className="w-full sm:w-auto" loading={loading}>
            {loading ? p.saving : isEdit ? p.saveChanges : p.save}
          </Button>
        </div>
      </form>
    </div>
  );
}
