"use client";
import { useI18n } from "@/lib/i18n/provider";

export function LocalizedName({ item, nameKey = "name", nameEnKey = "nameEn" }: { item: any; nameKey?: string; nameEnKey?: string }) {
  const { locale } = useI18n();
  return <>{locale === "en" && item[nameEnKey] ? item[nameEnKey] : item[nameKey]}</>;
}

export function LocalizedDesc({ item, descKey = "description", descEnKey = "descriptionEn" }: { item: any; descKey?: string; descEnKey?: string }) {
  const { locale } = useI18n();
  return <>{locale === "en" && item[descEnKey] ? item[descEnKey] : item[descKey]}</>;
}
