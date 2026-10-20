"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getDictionary, STORAGE_KEY, type Dictionary, type Locale } from "./dictionaries";

export interface LocaleContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dictionary;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ar";
}

function getServerSnapshot(): Locale {
  return "ar";
}

function applyLocale(next: Locale) {
  window.localStorage.setItem(STORAGE_KEY, next);
  const dir = next === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = next;
  document.documentElement.dir = dir;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyLocale(locale);
  }, [locale]);

  const toggleLocale = useCallback(() => {
    const next: Locale = locale === "ar" ? "en" : "ar";
    applyLocale(next);
    listeners.forEach((listener) => listener());
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      t: getDictionary(locale),
      toggleLocale,
    }),
    [locale, toggleLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
