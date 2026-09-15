"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, LockKeyholeIcon, ShieldCheckIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/actions/auth";
import { toast } from "sonner";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, action, pending] = useActionState(loginAction, null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success(t("dashboard?.saved") ?? "Welcome");
      router.push("/dashboard");
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(t(state.error));
    }
  }, [state, router, t]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          required
          placeholder={t("placeholder")}
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("password")}</Label>
          <span className="text-xs text-muted-foreground">{t("forgotPassword")}</span>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="h-11"
        />
      </div>
      <Button type="submit" size="lg" disabled={pending} className="mt-1 h-11 text-base">
        {pending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            {t("loggingIn")}
          </>
        ) : (
          <>
            <LockKeyholeIcon className="size-4" />
            {t("login")}
          </>
        )}
      </Button>
    </form>
  );
}

export function SecurityNote() {
  const t = useTranslations("auth");
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
      <p>{t("secureMessaging")}</p>
    </div>
  );
}