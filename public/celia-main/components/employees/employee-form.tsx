"use client";

import { useMemo, useState } from "react";
import { BadgeDollarSign, CheckCircle2, Pencil, Phone, UserRound, UsersRound, X, XCircle } from "lucide-react";
import { createEmployeeSchema, updateEmployeeSchema, EMPLOYEE_DEPARTMENTS } from "@/lib/employees/employee";
import type { EmployeeRow } from "@/lib/employees/queries";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface FieldErrors {
  name?: string;
  department?: string;
  phone?: string;
  salary?: string;
}

const headerGradient = `linear-gradient(135deg, color-mix(in srgb, var(--primary) 60%, white), var(--primary) 50%, color-mix(in srgb, var(--primary) 75%, black))`;

const selectClassName =
  "flex h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 appearance-none";

interface EmployeeFormProps {
  initialData?: EmployeeRow | null;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function EmployeeForm({ initialData, onSuccess, onClose }: EmployeeFormProps) {
  const { locale, t } = useLocale();
  const em = t.employeesManagement;
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [department, setDepartment] = useState(initialData?.department ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [salary, setSalary] = useState(initialData?.salary != null ? String(initialData.salary) : "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(
    () => (isEdit ? updateEmployeeSchema(t) : createEmployeeSchema(t)),
    [t, isEdit],
  );

  function reset() {
    setName(initialData?.name ?? "");
    setDepartment(initialData?.department ?? "");
    setPhone(initialData?.phone ?? "");
    setSalary(initialData?.salary != null ? String(initialData.salary) : "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const payload = {
      name,
      department,
      phone,
      salary: salary === "" ? undefined : salary,
      isActive: initialData?.isActive ?? true,
    };

    const result = schema.safeParse(payload);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        department: fieldErrors.department?.[0],
        phone: fieldErrors.phone?.[0],
        salary: fieldErrors.salary?.[0],
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(initialData ? `/api/employees/${initialData.id}` : "/api/employees", {
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
          text: data.message ?? (isEdit ? em.savedMessage : em.successMessage),
        });
        onSuccess?.();
      } else {
        setMessage({ type: "error", text: data.error ?? em.invalidData });
      }
    } catch {
      setMessage({ type: "error", text: em.serverError });
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
            <UserRound className="size-6" aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 className="text-base font-extrabold">{isEdit ? em.editTitle : em.addTitle}</h2>
          <p className="text-xs font-medium text-white/80">
            {isEdit ? em.editSubtitle : em.addSubtitle}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ms-auto rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
            aria-label={em.cancel}
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

        <FormField label={em.nameLabel} htmlFor="employee-name" error={errors.name}>
          <Input
            id="employee-name"
            name="name"
            placeholder={em.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            startIcon={<UserRound className="size-4" aria-hidden="true" />}
            hasError={!!errors.name}
            disabled={loading}
          />
        </FormField>

        <FormField label={em.departmentLabel} htmlFor="employee-department" error={errors.department}>
          <div className="relative">
            <UsersRound
              className="pointer-events-none absolute inset-y-0 start-3 z-10 my-auto size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              id="employee-department"
              name="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={loading}
              className={cn(
                selectClassName,
                "ps-10",
                errors.department && "border-destructive focus-visible:border-destructive",
              )}
            >
              <option value="">{em.selectDepartment}</option>
              {EMPLOYEE_DEPARTMENTS.map((value) => (
                <option key={value} value={value}>
                  {t.roles[value as keyof typeof t.roles]}
                </option>
              ))}
            </select>
          </div>
        </FormField>

        <FormField label={em.phoneLabel} htmlFor="employee-phone" error={errors.phone}>
          <Input
            id="employee-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder={em.phonePlaceholder}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            startIcon={<Phone className="size-4" aria-hidden="true" />}
            hasError={!!errors.phone}
            disabled={loading}
          />
        </FormField>

        <FormField label={em.salaryLabel} htmlFor="employee-salary" error={errors.salary}>
          <Input
            id="employee-salary"
            name="salary"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder={em.salaryPlaceholder}
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            startIcon={<BadgeDollarSign className="size-4" aria-hidden="true" />}
            hasError={!!errors.salary}
            disabled={loading}
          />
        </FormField>

        <div className="mt-auto flex items-center justify-end gap-3 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onClose ?? reset}
            disabled={loading}
          >
            <X className="size-4" aria-hidden="true" />
            {em.cancel}
          </Button>
          <Button type="submit" variant="success" size="lg" className="w-full sm:w-auto" loading={loading}>
            {loading ? em.saving : isEdit ? em.saveChanges : em.save}
          </Button>
        </div>
      </form>
    </div>
  );
}
