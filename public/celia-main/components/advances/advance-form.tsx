"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileText,
  HandCoins,
  User,
  X,
  XCircle,
} from "lucide-react";
import { createAdvanceSchema } from "@/lib/advances/advance";
import type { AdvanceRow } from "@/lib/advances/queries";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface FieldErrors {
  employeeId?: string;
  amount?: string;
  advanceDate?: string;
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

interface Employee {
  id: string;
  name: string;
}

export function AdvanceForm({
  employees,
  advance,
  onSuccess,
  onClose,
}: {
  employees: Employee[];
  advance?: AdvanceRow | null;
  onSuccess?: () => void;
  onClose?: () => void;
}) {
  const { locale, t } = useLocale();
  const isEdit = !!advance;
  const [employeeId, setEmployeeId] = useState(advance?.employeeId ?? "");
  const [amount, setAmount] = useState(advance ? String(advance.amount) : "");
  const [advanceDate, setAdvanceDate] = useState(
    advance ? toDateValue(advance.advanceDate) : todayValue(),
  );
  const [notes, setNotes] = useState(advance?.notes ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => createAdvanceSchema(t), [t]);

  const selectedEmployee = employees.find((employee) => employee.id === employeeId);

  function reset() {
    setEmployeeId("");
    setAmount("");
    setAdvanceDate(todayValue());
    setNotes("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const result = schema.safeParse({
      employeeId,
      employeeName: selectedEmployee?.name ?? advance?.employeeName ?? "",
      amount,
      advanceDate,
      notes,
    });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        employeeId: fieldErrors.employeeId?.[0],
        amount: fieldErrors.amount?.[0],
        advanceDate: fieldErrors.advanceDate?.[0],
        notes: fieldErrors.notes?.[0],
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(advance ? `/api/advances/${advance.id}` : "/api/advances", {
        method: advance ? "PUT" : "POST",
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
            data.message ?? (isEdit ? t.addAdvance.updatedMessage : t.addAdvance.successMessage),
        });
        reset();
        onSuccess?.();
      } else {
        setMessage({ type: "error", text: data.error ?? t.addAdvance.invalidData });
      }
    } catch {
      setMessage({ type: "error", text: t.addAdvance.serverError });
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
          <HandCoins className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-extrabold">
            {isEdit ? t.addAdvance.editTitle : t.addAdvance.title}
          </h2>
          <p className="text-xs font-medium text-white/80">
            {isEdit ? t.addAdvance.editSubtitle : t.addAdvance.subtitle}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ms-auto rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
            aria-label={t.addAdvance.cancel}
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

        <FormField label={t.addAdvance.employeeLabel} htmlFor="employeeId" error={errors.employeeId}>
          <div className="relative">
            <User
              className="pointer-events-none absolute inset-y-0 start-3 z-10 my-auto size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              id="employeeId"
              name="employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={loading}
              className={cn(
                selectClassName,
                "ps-10",
                errors.employeeId && "border-destructive focus-visible:border-destructive",
              )}
            >
              <option value="" disabled>
                {t.addAdvance.selectEmployee}
              </option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          {employees.length === 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">{t.addAdvance.noEmployees}</p>
          )}
        </FormField>

        <FormField label={t.addAdvance.amountLabel} htmlFor="amount" error={errors.amount}>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder={t.addAdvance.amountPlaceholder}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            startIcon={<Banknote className="size-4" aria-hidden="true" />}
            hasError={!!errors.amount}
            disabled={loading}
          />
        </FormField>

        <FormField label={t.addAdvance.dateLabel} htmlFor="advanceDate" error={errors.advanceDate}>
          <Input
            id="advanceDate"
            name="advanceDate"
            type="date"
            dir="ltr"
            value={advanceDate}
            onChange={(e) => setAdvanceDate(e.target.value)}
            startIcon={<CalendarDays className="size-4" aria-hidden="true" />}
            hasError={!!errors.advanceDate}
            disabled={loading}
          />
        </FormField>

        <FormField label={t.addAdvance.notesLabel} htmlFor="notes" error={errors.notes}>
          <div className="relative">
            <FileText
              className="pointer-events-none absolute start-3 top-3.5 z-10 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder={t.addAdvance.notesPlaceholder}
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
            {t.addAdvance.cancel}
          </Button>
          <Button type="submit" variant="success" size="lg" className="w-full sm:w-auto" loading={loading}>
            {loading ? t.addAdvance.saving : isEdit ? t.addAdvance.saveChanges : t.addAdvance.save}
          </Button>
        </div>
      </form>
    </div>
  );
}
