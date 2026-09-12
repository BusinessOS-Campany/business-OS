import type { Locale } from "./dictionary";

export function localizedName(item: { name: string; nameEn?: string | null } | null | undefined, locale: Locale): string {
  if (!item) return "";
  if (locale === "en" && item.nameEn) return item.nameEn;
  return item.name;
}

function stripHtml(s: string): string {
  return s
    .replace(/<style[^>]*>[^<]*<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function localizedDescription(item: { description?: string | null; descriptionEn?: string | null } | null | undefined, locale: Locale): string | null | undefined {
  if (!item) return undefined;
  const raw = locale === "en" && item.descriptionEn ? item.descriptionEn : item.description;
  return raw ? stripHtml(raw) : null;
}
