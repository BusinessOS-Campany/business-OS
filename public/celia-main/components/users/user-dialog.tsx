"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { createUserSchema, updateUserSchema } from "@/lib/users/user";
import { USER_ROLES } from "@/lib/users/users";
import { PERMISSION_GROUPS } from "@/lib/users/permissions";
import type { UserRow } from "@/lib/users/queries";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/cn";

interface FieldErrors {
  name?: string;
  username?: string;
  phone?: string;
  password?: string;
}

const selectClassName =
  "flex h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 appearance-none";

interface UserDialogProps {
  user?: UserRow | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserDialog({ user, onClose, onSuccess }: UserDialogProps) {
  const { locale, t } = useLocale();
  const um = t.usersManagement;
  const isEdit = !!user;

  const [firstName, setFirstName] = useState(user?.name ? user.name.split(" ")[0] : "");
  const [lastName, setLastName] = useState(
    user?.name ? user.name.split(" ").slice(1).join(" ") : "",
  );
  const [username, setUsername] = useState(user?.username ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState(user?.role ?? "employee");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<string[]>(user?.permissions ?? []);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(
    () => (isEdit ? updateUserSchema(t) : createUserSchema(t)),
    [t, isEdit],
  );

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const permissionOptions = useMemo(() => {
    return PERMISSION_GROUPS.map((group) => ({
      group,
      options: group.keys.map((key) => ({
        value: key,
        label: um.permissions[key],
      })),
    }));
  }, [um]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const name = [firstName, lastName].filter(Boolean).join(" ");
    if (!name.trim()) {
      setErrors({ name: um.nameError });
      return;
    }

    const payload = isEdit
      ? {
          name,
          phone,
          role,
          password,
          permissions,
        }
      : {
          name,
          username,
          phone,
          password,
          role,
          permissions,
        };

    const result = schema.safeParse(payload);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrors({
        name: fieldErrors.name?.[0],
        username: fieldErrors.username?.[0],
        phone: fieldErrors.phone?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(user ? `/api/users/${user.id}` : "/api/users", {
        method: user ? "PUT" : "POST",
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
          text: data.message ?? (isEdit ? um.savedMessage : um.successMessage),
        });
        onSuccess?.();
        onClose();
      } else {
        setMessage({ type: "error", text: data.error ?? um.invalidData });
      }
    } catch {
      setMessage({ type: "error", text: um.serverError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-1">
          <h2 className="text-lg font-extrabold text-foreground">
            {isEdit ? um.editTitle : um.addTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={um.cancel}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 pb-5 pt-4">
          {message && (
            <div
              role="alert"
              className={cn(
                "mb-4 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium",
                message.type === "success"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              <span>{message.text}</span>
            </div>
          )}

          <div className="space-y-4">
            <FormField
              label={um.usernameLabel}
              htmlFor="dialog-username"
              error={errors.username}
              required={!isEdit}
            >
              <Input
                id="dialog-username"
                name="username"
                dir="ltr"
                placeholder={um.usernamePlaceholder}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                hasError={!!errors.username}
                disabled={isEdit || loading}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={um.firstNameLabel}
                htmlFor="dialog-first-name"
                error={errors.name}
                required
              >
                <Input
                  id="dialog-first-name"
                  name="firstName"
                  placeholder={um.firstNamePlaceholder}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  hasError={!!errors.name}
                  disabled={loading}
                />
              </FormField>
              <FormField label={um.lastNameLabel} htmlFor="dialog-last-name">
                <Input
                  id="dialog-last-name"
                  name="lastName"
                  placeholder={um.lastNamePlaceholder}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label={um.phoneLabel} htmlFor="dialog-phone" error={errors.phone}>
                <Input
                  id="dialog-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  placeholder={um.phonePlaceholder}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  hasError={!!errors.phone}
                  disabled={loading}
                />
              </FormField>

              <FormField label={um.roleLabel} htmlFor="dialog-role">
                <div className="relative">
                  <select
                    id="dialog-role"
                    name="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                    className={cn(selectClassName, "appearance-none pe-9")}
                  >
                    {USER_ROLES.map((value) => (
                      <option key={value} value={value}>
                        {t.roles[value]}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 end-3 my-auto text-xs text-muted-foreground">
                    ▼
                  </span>
                </div>
              </FormField>
            </div>

            <FormField
              label={isEdit ? um.newPasswordLabel : um.passwordLabel}
              htmlFor="dialog-password"
              error={errors.password}
              hint={isEdit ? um.passwordEditHint : undefined}
              required={!isEdit}
            >
              <Input
                id="dialog-password"
                name="password"
                type="password"
                placeholder={um.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hasError={!!errors.password}
                disabled={loading}
              />
            </FormField>

            <FormField label={um.permissionsLabel}>
              <MultiSelect
                options={permissionOptions.flatMap(({ options }) => options)}
                value={permissions}
                onChange={setPermissions}
                placeholder={um.permissionsPlaceholder}
                disabled={loading}
              />
            </FormField>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {um.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {loading ? um.saving : um.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
