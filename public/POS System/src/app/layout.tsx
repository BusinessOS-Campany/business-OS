import type { Metadata } from "next";
import { Cairo, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import type { Locale } from "@/i18n/dictionary";
import { LANG_COOKIE } from "@/i18n/LanguageProvider";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yemen POS",
  description: "Point of Sale Platform for Yemeni businesses",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const cookieLang = store.get(LANG_COOKIE)?.value;
  const lang: Locale = cookieLang === "ar" || cookieLang === "en" ? cookieLang : "ar";
  const theme = store.get("theme")?.value ?? "light";

  return (
    <html
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
      className={`${cairo.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers lang={lang} theme={theme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}