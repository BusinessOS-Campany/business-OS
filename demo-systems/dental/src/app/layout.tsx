import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Kufi_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import { mountedHref, serviceWorkerUrl } from "@/lib/app-url";
import { dirByLocale, LANG_COOKIE, localeFrom, type Locale } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const kufiArabic = Noto_Kufi_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Dar Al-Asnan | نظام إدارة عيادات الأسنان",
    template: "%s | Dar Al-Asnan",
  },
  description:
    "Dental clinic management system for Yemen — appointments, clinical records, billing and inventory. / نظام إدارة متكامل لعيادات طب الأسنان في اليمن.",
  applicationName: "Dar Al-Asnan",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dar Al-Asnan",
  },
  icons: {
    // Next does not prefix metadata icons with the basePath, so a bare
    // /icons/... would render the platform's favicon inside the demo.
    icon: [
      { url: mountedHref("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: mountedHref("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: mountedHref("/icons/apple-touch-icon.png"),
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1013" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const locale: Locale = localeFrom(cookieStore.get(LANG_COOKIE)?.value);
  const dir = dirByLocale[locale];

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${kufiArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <PwaRegister swUrl={serviceWorkerUrl()} />
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}