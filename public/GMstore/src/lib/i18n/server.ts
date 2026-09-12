import { cookies } from "next/headers";
import { getDictionary, getDirection, type Locale } from "./dictionary";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return (cookieStore.get("locale")?.value as Locale) || "ar";
}

export async function getServerTranslations() {
  const locale = await getServerLocale();
  return { locale, direction: getDirection(locale), t: (key: string) => getDictionary(locale)[key] || key };
}
