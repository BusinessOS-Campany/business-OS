import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  date: Date | string | null | undefined,
  locale: string = "en"
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-YE" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(
  date: Date | string | null | undefined,
  locale: string = "en"
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-YE" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatTime(
  date: Date | string | null | undefined,
  locale: string = "en"
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-YE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatNumber(value: number | string | null | undefined, locale: string = "en"): string {
  if (value === null || value === undefined || value === "") return "0";
  return new Intl.NumberFormat(locale === "ar" ? "ar-YE" : "en-GB").format(Number(value));
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = "YER",
  locale: string = "en"
): string {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (currency === "YER") {
    try {
      return new Intl.NumberFormat(locale === "ar" ? "ar-YE" : "en-GB", {
        maximumFractionDigits: 0,
      }).format(num) + " " + (locale === "ar" ? "ريال" : "YER");
    } catch {
      return `${num.toLocaleString()} YER`;
    }
  }
  if (currency === "USD") {
    return new Intl.NumberFormat(locale === "ar" ? "ar-YE" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + " USD";
  }
  return `${num.toLocaleString()} ${currency}`;
}

export function calculateAge(dateOfBirth: Date | string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  const ageDt = new Date(diff);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export function truncate(str: string | null | undefined, len = 40): string {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}