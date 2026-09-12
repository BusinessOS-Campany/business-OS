import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getDictAndDir } from "@/core/i18n/server";
import { ThemeProvider } from "@/components/theme-provider";
import CustomCursor from "@/components/landing/custom-cursor";

export const metadata: Metadata = {
  title: "Business OS",
  description:
    "Multi-tenant white-label business management platform — نظام إدارة الأعمال متعدد المستأجرين",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#0263D1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = await getDictAndDir();
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/BO.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/BO.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('bos_theme');if(t==='light'||t==='dark')document.documentElement.classList.add(t);else if(!t||window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}`,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <CustomCursor>{children}</CustomCursor>
        </ThemeProvider>
      </body>
    </html>
  );
}
