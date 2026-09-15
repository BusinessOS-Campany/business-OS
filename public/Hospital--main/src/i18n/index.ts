import { en } from "./messages/en";
import { ar } from "./messages/ar";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export function isLocale(value: string | undefined): value is Locale {
  return value === "ar" || value === "en";
}

export function getMessages(locale: Locale) {
  return locale === "ar" ? ar : en;
}

export function getDir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export const LOCALE_COOKIE = "ycm_locale";