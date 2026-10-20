"use client";
import { useEffect } from "react";
import { I18nProvider } from "@/lib/i18n/provider";
import { getDirection } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/dictionary";

export function I18nServerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    const locale = stored === "en" ? "en" : "ar";
    document.documentElement.dir = getDirection(locale);
    document.documentElement.lang = locale;
  }, []);

  return <I18nProvider>{children}</I18nProvider>;
}
