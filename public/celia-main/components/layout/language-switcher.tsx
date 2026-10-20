"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

export function LanguageSwitcher() {
  const { locale, toggleLocale, t } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="flex size-9 items-center justify-center gap-1 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={locale === "ar" ? t.header.switchToEnglish : t.header.switchToArabic}
      title={locale === "ar" ? "English" : "العربية"}
    >
      <Languages className="size-5" aria-hidden="true" />
      <span className="text-xs font-bold" aria-hidden="true">
        {locale === "ar" ? "EN" : "AR"}
      </span>
    </button>
  );
}
