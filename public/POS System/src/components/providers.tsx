"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { LanguageProvider, useLang, type Locale } from "@/i18n/LanguageProvider";

function ToasterHost() {
  const { lang } = useLang();
  return (
    <Toaster
      position={lang === "ar" ? "bottom-left" : "bottom-right"}
      dir={lang === "ar" ? "rtl" : "ltr"}
      richColors
      closeButton
      toastOptions={{ style: { fontFamily: "inherit" } }}
    />
  );
}

export function Providers({
  children,
  lang,
  theme,
}: {
  children: ReactNode;
  lang: Locale;
  theme?: string;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme={theme ?? "light"} enableSystem disableTransitionOnChange>
      <LanguageProvider lang={lang}>
        {children}
        <ToasterHost />
      </LanguageProvider>
    </ThemeProvider>
  );
}