"use client";
import { useI18n } from "@/lib/i18n/provider";
import { Languages } from "lucide-react";

export function LangToggle() {
  const { locale, toggleLocale } = useI18n();
  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
      title={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <Languages className="h-3.5 w-3.5" />
      {locale === "ar" ? "EN" : "AR"}
    </button>
  );
}
