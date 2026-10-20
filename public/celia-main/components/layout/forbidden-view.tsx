"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function ForbiddenView() {
  const { t } = useLocale();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 sm:px-6">
      <div className="fixed end-2 top-2 z-10 flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg sm:p-10">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="size-10 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">{t.forbidden.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t.forbidden.message}</p>
        <p className="mt-1 text-xs text-muted-foreground/80">{t.forbidden.contactAdmin}</p>

        <div className="mt-8 flex flex-col gap-2">
          <Link
            href="/"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.forbidden.backHome}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-input px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t.forbidden.signOut}
          </button>
        </div>
      </div>
    </main>
  );
}
