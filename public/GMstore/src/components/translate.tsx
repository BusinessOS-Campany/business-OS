"use client";
import { useI18n } from "@/lib/i18n/provider";

export function T({ k }: { k: string }) {
  const { t } = useI18n();
  return <>{t(k)}</>;
}
