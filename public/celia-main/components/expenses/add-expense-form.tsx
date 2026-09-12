"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileText,
  ReceiptText,
  Tag,
  Wallet,
  XCircle,
  X,
} from "lucide-react";
import { EXPENSE_PAYMENT_METHODS, createExpenseSchema } from "@/lib/expenses/expense";
import type { ExpenseRow } from "@/lib/expenses/queries";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface FieldErrors {
  type?: string;
  amount?: string;
  expenseDate?: string;
  paymentMethod?: string;
  notes?: string;
}

const headerGradient = `linear-gradient(135deg, color-mix(in srgb, var(--primary) 60%, white), var(--primary) 50%, color-mix(in srgb, var(--primary) 75%, black))`;

const selectClassName =
  "flex h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 appearance-none";

function toDateValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function todayValue(): string {
  return toDateValue(new Date());
}

interface AddExpenseFormProps {
  expense?: ExpenseRow | null;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function AddExpenseForm({ expense, onSuccess, onClose }: AddExpenseFormProps) {
  const { locale, t } = useLocale();
  const isEdit = !!expense;
  const [type, setType] = useState(expense?.type ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [expenseDate, setExpenseDate] = useState(
    expense ? toDateValue(expense.expenseDate) : todayValue(),
  );
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => createExpenseSchema(t), [t]);

  function reset() {
    setType("");
    setAmount("");
    setExpenseDate(todayValue());
    setPaymentMethod("");
    setNotes("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const result = schema.safeParse({ type, amount, expenseDate, paymentMethod, notes });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        type: fieldErrors.type?.[0],
        amount: fieldErrors.amount?.[0],
        expenseDate: fieldErrors.expenseDate?.[0],
        paymentMethod: fieldErrors.paymentMethod?.[0],
        notes: fieldErrors.notes?.[0],
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(expense ? `/api/expenses/${expense.id}` : "/api/expenses", {
        method: expense ? "PUT" : "POST",
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
            data.message ?? (isEdit ? t.addExpense.updatedMessage : t.addExpense.successMessage),
        });
        reset();
        onSuccess?.();
      } else {
        setMessage({ type: "error", text: data.error ?? t.addExpense.invalidData });
      }
    } catch {
      setMessage({ type: "error", text: t.addExpense.serverError });
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
          <ReceiptText className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-extrabold">
            {isEdit ? t.addExpense.editTitle : t.addExpense.title}
          </h2>
          <p className="text-xs font-medium text-white/80">
            {isEdit ? t.addExpense.editSubtitle : t.addExpense.subtitle}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ms-auto rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
            aria-label={t.addExpense.cancel}
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
          <FormField label={t.addExpense.typeLabel} htmlFor="type" error={errors.type}>
            <Input
              id="type"
              name="type"
              type="text"
              placeholder={t.addExpense.typePlaceholder}
              value={type}
              onChange={(e) => setType(e.target.value)}
              startIcon={<Tag className="size-4" aria-hidden="true" />}
              hasError={!!errors.type}
              disabled={loading}
            />
          </FormField>

          <FormField label={t.addExpense.amountLabel} htmlFor="amount" error={errors.amount}>
            <Input
              id="amount"
              name="amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder={t.addExpense.amountPlaceholder}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              startIcon={<Banknote className="size-4" aria-hidden="true" />}
              hasError={!!errors.amount}
              disabled={loading}
            />
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t.addExpense.dateLabel} htmlFor="expenseDate" error={errors.expenseDate}>
            <Input
              id="expenseDate"
              name="expenseDate"
              type="date"
              dir="ltr"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              startIcon={<CalendarDays className="size-4" aria-hidden="true" />}
              hasError={!!errors.expenseDate}
              disabled={loading}
            />
          </FormField>

          <FormField
            label={t.addExpense.paymentMethodLabel}
            htmlFor="paymentMethod"
            error={errors.paymentMethod}
          >
            <div className="relative">
              <Wallet
                className="pointer-events-none absolute inset-y-0 start-3 z-10 my-auto size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={loading}
                className={cn(
                  selectClassName,
                  "ps-10",
                  errors.paymentMethod && "border-destructive focus-visible:border-destructive",
                )}
              >
                <option value="" disabled>
                  {t.addExpense.selectPaymentMethod}
                </option>
                {EXPENSE_PAYMENT_METHODS.map((value) => (
                  <option key={value} value={value}>
                    {t.addExpense.paymentMethods[value]}
                  </option>
                ))}
              </select>
            </div>
          </FormField>
        </div>

        <FormField label={t.addExpense.notesLabel} htmlFor="notes" error={errors.notes}>
          <div className="relative">
            <FileText
              className="pointer-events-none absolute start-3 top-3.5 z-10 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder={t.addExpense.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              className={cn(
                "w-full resize-none rounded-lg border border-input bg-card py-3 text-sm text-foreground shadow-sm transition-colors duration-150",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                "disabled:cursor-not-allowed disabled:opacity-60",
                "ps-10 pe-3.5",
                errors.notes && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
              )}
            />
          </div>
        </FormField>

        <div className="mt-auto flex items-center justify-end gap-3 border-t border-border pt-5">
          <Button type="button" variant="outline" size="lg" onClick={onClose ?? reset} disabled={loading}>
            <X className="size-4" aria-hidden="true" />
            {t.addExpense.cancel}
          </Button>
          <Button type="submit" variant="success" size="lg" className="w-full sm:w-auto" loading={loading}>
            {loading ? t.addExpense.saving : isEdit ? t.addExpense.saveChanges : t.addExpense.save}
          </Button>
        </div>
      </form>
    </div>
  );
}
