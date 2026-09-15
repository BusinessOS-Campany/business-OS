import Link from "next/link";
import { ShieldX } from "lucide-react";
import { cookies } from "next/headers";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { getBrand } from "@/lib/services/hospital";
import { BrandMark } from "@/components/app/brand-mark";
import { LanguageToggle } from "@/components/app/language-toggle";
import { ThemeToggle } from "@/components/app/theme-toggle";

export const metadata = { title: "403 · Forbidden" };

export default async function ForbiddenPage() {
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const t = getMessages(isLocale(localeRaw) ? localeRaw : defaultLocale);
  const brand = await getBrand();

  return (
    <main className="app-glow flex min-h-dvh flex-col bg-dots">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <BrandMark size="md" />
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">YemenCare HMS</p>
            <p className="text-xs text-muted-foreground">{brand.nameAr}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          <div className="flex size-20 items-center justify-center rounded-2xl border bg-card shadow-[var(--shadow-popover)]">
            <ShieldX className="size-9 text-destructive" />
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight">403</h1>
          <p className="mt-2 text-lg font-medium">{t.common.unauthorized}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.errors.unauthorizedBody}</p>
          <div className="mt-8 flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t.common.backToHome}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}