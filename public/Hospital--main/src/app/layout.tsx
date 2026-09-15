import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { isLocale, defaultLocale, getMessages, getDir, LOCALE_COOKIE } from "@/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "YemenCare HMS — Hospital Management System",
    template: "%s · YemenCare HMS",
  },
  description:
    "Enterprise hospital operating system for hospitals and medical centers in Yemen.",
  applicationName: "YemenCare HMS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1118" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const dir = getDir(locale);
  const messages = getMessages(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>
        <Providers locale={locale} messages={messages}>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}