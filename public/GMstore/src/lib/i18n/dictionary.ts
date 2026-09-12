import { ar, en } from "./translations";

export type Locale = "ar" | "en";

const dictionaries: Record<Locale, Record<string, string>> = { ar, en };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
