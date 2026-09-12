import type { Metadata } from "next";
import Script from "next/script";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { STORAGE_KEY } from "@/lib/i18n/dictionaries";
import "./globals.css";
import "./fixes.css";

export const metadata: Metadata = {
  title: {
    default: "سيليا | نظام إدارة الإنترنت ",
    template: "%s | سيليا",
  },
  description: "نظام متكامل لإدارةالإنترنت ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Script
          id="locale-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var l=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});var d=l==="en"?"ltr":"rtl";var h=document.documentElement;h.setAttribute("dir",d);h.setAttribute("lang",l==="en"?"en":"ar");}catch(e){}`,
          }}
        />
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("celia-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}`,
          }}
        />
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
