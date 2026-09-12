"use client";

import { useMemo, useState } from "react";
import { Banknote, CheckCircle2, Pencil, Smartphone, StickyNote, Wallet, X, XCircle } from "lucide-react";
import { BALANCE_PROVIDERS, createBalanceChargeSchema } from "@/lib/balance/charge";
import type { BalanceChargeRow } from "@/lib/balance/queries";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface FieldErrors {
  provider?: string;
  amount?: string;
}

const headerGradient = `linear-gradient(135deg, color-mix(in srgb, var(--success) 60%, white), var(--success) 50%, color-mix(in srgb, var(--success) 75%, black))`;

const selectClassName =
  "flex h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 appearance-none";

const textareaClassName =
  "flex min-h-28 w-full rounded-lg border border-input bg-card px-3.5 py-3 text-sm text-foreground shadow-sm transition-colors duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60";

interface BalanceChargeFormProps {
  initialData?: BalanceChargeRow | null;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function BalanceChargeForm({ initialData, onSuccess, onClose }: BalanceChargeFormProps) {
  const { locale, t } = useLocale();
  const bt = t.balanceTotals;
  const isEdit = !!initialData;
  const [provider, setProvider] = useState(initialData?.provider ?? "");
  const [amount, setAmount] = useState(initialData?.amount != null ? String(initialData.amount) : "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => createBalanceChargeSchema(t), [t]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const result = schema.safeParse({ provider, amount, notes });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        provider: fieldErrors.provider?.[0],
        amount: fieldErrors.amount?.[0],
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(
        initialData ? `/api/balance/charge/${initialData.id}` : "/api/balance/charge",
        {
          method: initialData ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": locale,
          },
          body: JSON.stringify(result.data),
        },
      );
      const data = (await res.json()) as { message?: string; error?: string };

      if (res.ok) {
        setMessage({
          type: "success",
          text: data.message ?? (isEdit ? bt.updatedMessage : t.balance.successMessage),
        });
        setProvider("");
        setAmount("");
        setNotes("");
        onSuccess?.();
      } else {
        setMessage({ type: "error", text: data.error ?? t.balance.invalidData });
      }
    } catch {
      setMessage({ type: "error", text: t.balance.serverError });
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
          <h2 className="text-base font-extrabold">{isEdit ? bt.editTitle : t.balance.title}</h2>
          <p className="text-xs font-medium text-white/80">
            {isEdit ? bt.editSubtitle : t.balance.subtitle}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ms-auto rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
            aria-label={t.balance.cancel}
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

        <FormField label={t.balance.providerLabel} htmlFor="provider" error={errors.provider}>
          <div className="relative">
            <Smartphone
              className="pointer-events-none absolute inset-y-0 start-3 z-10 my-auto size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              id="provider"
              name="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={loading}
              className={cn(
                selectClassName,
                "ps-10",
                errors.provider && "border-destructive focus-visible:border-destructive",
              )}
            >
              <option value="" disabled>
                {t.balance.selectProvider}
              </option>
              {BALANCE_PROVIDERS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </FormField>

        <FormField label={t.balance.amountLabel} htmlFor="amount" error={errors.amount}>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            placeholder={t.balance.amountPlaceholder}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            startIcon={<Banknote className="size-4" aria-hidden="true" />}
            hasError={!!errors.amount}
            disabled={loading}
          />
        </FormField>

        <FormField label={t.balance.notesLabel} htmlFor="notes">
          <div className="relative">
            <StickyNote
              className="pointer-events-none absolute inset-y-0 start-3 z-10 my-auto size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <textarea
              id="notes"
              name="notes"
              placeholder={t.balance.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              className={cn(textareaClassName, "ps-10")}
            />
          </div>
        </FormField>

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
              {t.balance.cancel}
            </Button>
            <Button type="submit" variant="success" size="lg" className="w-full sm:w-auto" loading={loading}>
              <Banknote className="size-4" aria-hidden="true" />
              {loading ? t.balance.saving : isEdit ? bt.saveChanges : t.balance.save}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
