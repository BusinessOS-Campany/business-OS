"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, getDirection, type Locale } from "./dictionary";

interface I18nContext {
  locale: Locale;
  direction: "rtl" | "ltr";
  t: (key: string) => string;
  toggleLocale: () => void;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContext>({
  locale: "ar",
  direction: "rtl",
  t: (k: string) => k,
  toggleLocale: () => {},
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored === "ar" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
    document.cookie = `locale=${l};path=/;max-age=31536000`;
    document.documentElement.dir = getDirection(l);
    document.documentElement.lang = l;
    router.refresh();
  }, [router]);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "ar" ? "en" : "ar");
  }, [locale, setLocale]);

  const dict = getDictionary(locale);
  const t = useCallback((key: string) => dict[key] || key, [dict]);

  return (
    <I18nContext.Provider value={{ locale, direction: getDirection(locale), t, toggleLocale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useTranslation() {
  const { t } = useI18n();
  return { t };
}
