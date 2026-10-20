import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function randomId(prefix = ""): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}_${rand}` : rand;
}

export function formatDate(d: Date | string, locale = "en"): string {
  return new Date(d).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string, locale = "en"): string {
  return new Date(d).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toArabicDigits(input: string | number): string {
  const digits = "٠١٢٣٤٥٦٧٨٩";
  return String(input).replace(/[0-9]/g, (d) => digits[Number(d)]);
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 1) + "…";
}

export function isRtlLang(lang: string): boolean {
  return lang === "ar";
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}