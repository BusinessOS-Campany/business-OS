"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Layers,
  Pencil,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import {
  HOBANI_CARD_TYPES,
  HOBANI_PERIODS,
  createHobaniIncomeSchema,
  hobaniPeriodLabel,
} from "@/lib/hobani/income";
import type { HobaniIncomeRecord } from "@/lib/hobani/totals";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface FieldErrors {
  income?: string;
  period?: string;
  cardType?: string;
  quantity?: string;
}

const headerGradient = `linear-gradient(135deg, color-mix(in srgb, var(--primary) 60%, white), var(--primary) 50%, color-mix(in srgb, var(--primary) 75%, black))`;

const selectClassName =
  "flex h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 appearance-none";

interface HobaniIncomeFormProps {
  initialData?: HobaniIncomeRecord | null;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function HobaniIncomeForm({ initialData, onSuccess, onClose }: HobaniIncomeFormProps) {
  const { locale, t } = useLocale();
  const isEdit = !!initialData;
  const [income, setIncome] = useState(
    initialData?.income != null ? String(initialData.income) : "",
  );
  const [period, setPeriod] = useState(initialData?.period ?? "");
  const [cardType, setCardType] = useState(
    initialData?.cardType != null ? String(initialData.cardType) : "",
  );
  const [quantity, setQuantity] = useState(
    initialData?.quantity != null ? String(initialData.quantity) : "",
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => createHobaniIncomeSchema(t), [t]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const result = schema.safeParse({ income, period, cardType, quantity });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        income: fieldErrors.income?.[0],
        period: fieldErrors.period?.[0],
        cardType: fieldErrors.cardType?.[0],
        quantity: fieldErrors.quantity?.[0],
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const url = initialData ? `/api/hobani/income/${initialData.id}` : "/api/hobani/income";
      const res = await fetch(url, {
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
          text: data.message ?? (isEdit ? t.hobani.updatedMessage : t.hobani.successMessage),
        });
        if (!isEdit) {
          setIncome("");
          setPeriod("");
          setCardType("");
          setQuantity("");
        }
        onSuccess?.();
      } else {
        setMessage({ type: "error", text: data.error ?? t.hobani.invalidData });
      }
    } catch {
      setMessage({ type: "error", text: t.hobani.serverError });
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
            <Wallet className="size-6" aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 className="text-base font-extrabold">
            {isEdit ? t.hobani.editTitle : t.hobani.title}
          </h2>
          <p className="text-xs font-medium text-white/80">
            {isEdit ? t.hobani.editSubtitle : t.hobani.subtitle}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ms-auto rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
            aria-label={t.hobani.cancel}
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

        <div className="grid gap-5">
          <FormField label={t.hobani.incomeLabel} htmlFor="income" error={errors.income}>
            <Input
              id="income"
              name="income"
              type="number"
              inputMode="decimal"
              min={1}
              step="any"
              placeholder={t.hobani.incomePlaceholder}
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              startIcon={<Banknote className="size-4" aria-hidden="true" />}
              hasError={!!errors.income}
              disabled={loading}
            />
          </FormField>

          <FormField label={t.hobani.periodLabel} htmlFor="period" error={errors.period}>
            <div className="relative">
              <Clock
                className="pointer-events-none absolute inset-y-0 start-3 z-10 my-auto size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <select
                id="period"
                name="period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                disabled={loading}
                className={cn(
                  selectClassName,
                  "ps-10",
                  errors.period && "border-destructive focus-visible:border-destructive",
                )}
              >
                <option value="" disabled>
                  {t.hobani.selectPeriod}
                </option>
                {HOBANI_PERIODS.map((value) => (
                  <option key={value} value={value}>
                    {hobaniPeriodLabel(value, t)}
                  </option>
                ))}
              </select>
            </div>
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t.hobani.cardTypeLabel} htmlFor="cardType" error={errors.cardType}>
            <div className="relative">
              <CreditCard
                className="pointer-events-none absolute inset-y-0 start-3 z-10 my-auto size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <select
                id="cardType"
                name="cardType"
                value={cardType}
                onChange={(e) => {
                  const value = e.target.value;
                  setCardType(value);
                  if (value === "") setQuantity("");
                }}
                disabled={loading}
                className={cn(
                  selectClassName,
                  "ps-10",
                  errors.cardType && "border-destructive focus-visible:border-destructive",
                )}
              >
                <option value="">
                  {t.hobani.noCardType}
                </option>
                {HOBANI_CARD_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {t.hobani.cardLabel} {value}
                  </option>
                ))}
              </select>
            </div>
          </FormField>

          <FormField label={t.hobani.quantityLabel} htmlFor="quantity" error={errors.quantity}>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={t.hobani.quantityPlaceholder}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              startIcon={<Layers className="size-4" aria-hidden="true" />}
              hasError={!!errors.quantity}
              disabled={loading || cardType === ""}
            />
          </FormField>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-border pt-5">
          <p className="hidden text-xs text-muted-foreground sm:block">
            {t.hobani.saveHint}
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onClose}
              disabled={loading}
            >
              <X className="size-4" aria-hidden="true" />
              {t.hobani.cancel}
            </Button>
            <Button type="submit" variant="success" size="lg" className="w-full sm:w-auto" loading={loading}>
              <CreditCard className="size-4" aria-hidden="true" />
              {loading ? t.hobani.saving : isEdit ? t.hobani.saveChanges : t.hobani.save}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
