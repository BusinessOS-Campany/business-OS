import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AppPreferencesProvider } from "@/components/providers/app-preferences";
import { PwaRegister } from "@/components/pwa-register";
import { mountedHref, serviceWorkerUrl } from "@/lib/pwa";
import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeInitScript } from "@/components/providers/theme-init-script";
import { routing } from "@/i18n/routing";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-family",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic-family",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-family",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
    applicationName: "ClinicOS",
    // Next does not prefix metadata with the basePath. A bare
    // /manifest.webmanifest is therefore fetched from the platform's root — 404,
    // and the browser never discovers this app's manifest, so it is not
    // installable as its own app.
    manifest: mountedHref("/manifest.webmanifest"),
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "ClinicOS",
    },
    icons: {
      // Same reason: a bare /icons/... would render the platform's favicon
      // inside the app.
      icon: [
        { url: mountedHref("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
        { url: mountedHref("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
      ],
      apple: mountedHref("/icons/apple-touch-icon.png"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${plexArabic.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-svh bg-background font-sans antialiased">
        <PwaRegister swUrl={serviceWorkerUrl()} />
        <MotionConfig reducedMotion="user">
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider defaultTheme="system" disableTransitionOnChange>
              <AppPreferencesProvider>{children}</AppPreferencesProvider>
              <Toaster />
            </ThemeProvider>
          </NextIntlClientProvider>
        </MotionConfig>
      </body>
    </html>
  );
}