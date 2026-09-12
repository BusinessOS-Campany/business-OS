"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldAlert, User } from "lucide-react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginSchema = z.object({
    username: z.string().trim().min(3, t.login.usernameMinError),
    password: z.string().min(1, t.login.passwordError),
  });

  const errorMessages: Record<string, string> = {
    INVALID_USERNAME_OR_PASSWORD: t.login.invalidCredentials,
    EMAIL_NOT_VERIFIED: t.login.emailNotVerified,
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = loginSchema.safeParse({ username, password });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        username: fieldErrors.username?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const { error } = await authClient.signIn.username({
        username: username.trim(),
        password,
        rememberMe,
      });

      if (error) {
        setFormError(errorMessages[error.code ?? ""] ?? t.login.genericError);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setFormError(t.login.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <FormField label={t.login.username} htmlFor="username" error={errors.username}>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          dir="ltr"
          placeholder={t.login.usernamePlaceholder}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          startIcon={<User className="size-4" aria-hidden="true" />}
          hasError={!!errors.username}
          disabled={loading}
          autoFocus
        />
      </FormField>

      <FormField label={t.login.password} htmlFor="password" error={errors.password}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t.login.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            startIcon={<Lock className="size-4" aria-hidden="true" />}
            hasError={!!errors.password}
            disabled={loading}
            className="pe-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </FormField>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-4 rounded border-input accent-primary"
            disabled={loading}
          />
          {t.login.rememberMe}
        </label>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full bg-gradient-to-l from-teal-500 via-teal-500 to-indigo-500 text-white shadow-lg shadow-teal-500/25 hover:from-teal-400 hover:via-teal-400 hover:to-indigo-400"
        loading={loading}
      >
        {loading ? t.login.signingIn : t.login.signIn}
      </Button>
    </form>
  );
}
