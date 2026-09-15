import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export interface HospitalBrand {
  nameAr: string;
  nameEn: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  governorate?: string;
  note?: string;
}

export const getBrand = cache(async (): Promise<HospitalBrand> => {
  const settings = await prisma.systemSetting.findMany();
  const map = new Map(settings.map((s) => [s.key, s.value]));
  return {
    nameAr:
      map.get("hospital_name_ar") ?? "مستشفى اليمن الحديث",
    nameEn: map.get("hospital_name_en") ?? "Yemen Modern Hospital",
    logoUrl: map.get("hospital_logo") || undefined,
    phone: map.get("hospital_phone") || undefined,
    email: map.get("hospital_email") || undefined,
    address: map.get("hospital_address") || undefined,
    governorate: map.get("hospital_governorate") || undefined,
    note: map.get("hospital_note") || undefined,
  };
});

export interface AppSettings {
  [key: string]: string;
}

export const getSettings = cache(async (): Promise<AppSettings> => {
  const settings = await prisma.systemSetting.findMany();
  const map: AppSettings = {};
  for (const s of settings) map[s.key] = s.value;
  return map;
});

export async function getSettingValue(key: string): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSettingValue(
  key: string,
  value: string,
  category = "GENERAL",
  type = "string"
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value, category, type },
  });
}

export function currencySymbol(code: string, locale = "en"): string {
  if (code === "YER") return locale === "ar" ? "ر.ي" : "YER";
  if (code === "USD") return "USD";
  if (code === "SAR") return "SAR";
  return code;
}